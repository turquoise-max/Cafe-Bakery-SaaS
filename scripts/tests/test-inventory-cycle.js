require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // Use Anon Key and Login

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
  console.log('Starting Inventory Cycle Test...');

  try {
    // 0. Login as Test User
    // Use a fixed email to avoid cluttering auth users and bypass format checks if dynamic ones fail
    const email = 'inventory_test_user@gmail.com'; 
    const password = 'test-password-123';
    console.log(`0. Attempting to login/signup as user: ${email}`);

    // Try Sign In First
    let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError || !authData.session) {
      console.log('Sign in failed or no session, trying to Sign Up...');
      
      const signUpResult = await supabase.auth.signUp({
        email,
        password,
      });
      
      authData = signUpResult.data;
      authError = signUpResult.error;

      if (authError) {
         console.error('Sign Up Error Details:', authError);
         throw new Error(`Auth failed: ${authError.message}`);
      }
      
      if (!authData.session) {
        console.warn('WARNING: Sign up successful but no session returned.');
        console.warn('This usually means "Email Confirmations" is enabled in Supabase.');
        console.warn('Please manually confirm this user in the Supabase Dashboard Authentication tab, or disable Email Confirmations.');
        throw new Error('Email confirmation required for new user.');
      }
    }
    
    if (authError) {
       console.error('Sign Up Error Details:', authError);
       // If sign up fails (e.g. rate limit), try sign in with a fixed test user if exists, or fail.
       console.log('Sign up failed, trying to sign in directly (in case user exists)...');
       const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
       if (signInError) {
         console.error('Sign In Error Details:', signInError);
         throw new Error(`Auth failed: SignUp(${authError.message}) / SignIn(${signInError.message})`);
       }
    } else if (!authData.session) {
       // If session is null, email confirmation might be required.
       // Try immediate sign in, sometimes works if email confirm is off.
       const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
       if (signInError || !signInData.session) {
         throw new Error('Sign up successful but no session. Email confirmation might be required.');
       }
    }
    
    console.log('Logged in successfully. User ID:', (await supabase.auth.getUser()).data.user?.id);


    // 1. Setup Test Data
    console.log('1. Setting up test data...');
    
    // Create Organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({ name: 'Test Org', slug: `test-org-${Date.now()}` })
      .select()
      .single();
    if (orgError) throw orgError;
    console.log('Created Organization:', org.id);

    // Create Store
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .insert({ organization_id: org.id, name: 'Test Store', code: `TEST-${Date.now()}` })
      .select()
      .single();
    if (storeError) throw storeError;
    console.log('Created Store:', store.id);

    // Create Raw Material (Flour)
    const { data: flour, error: flourError } = await supabase
      .from('items')
      .insert({
        store_id: store.id,
        name: 'Test Flour',
        type: 'raw',
        base_unit: 'g',
        is_inventory_managed: true,
        safety_stock: 100
      })
      .select()
      .single();
    if (flourError) throw flourError;
    console.log('Created Raw Material:', flour.name, flour.id);

    // Create Finished Good (Bread)
    const { data: bread, error: breadError } = await supabase
      .from('items')
      .insert({
        store_id: store.id,
        name: 'Test Bread',
        type: 'finished',
        base_unit: 'ea',
        sale_price: 5000
      })
      .select()
      .single();
    if (breadError) throw breadError;
    console.log('Created Finished Good:', bread.name, bread.id);

    // Create Recipe (Bread uses 100g Flour)
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .insert({
        store_id: store.id,
        output_item_id: bread.id,
        output_quantity: 1,
        version: 1,
        is_active: true
      })
      .select()
      .single();
    if (recipeError) throw recipeError;

    const { error: recipeItemError } = await supabase
      .from('recipe_items')
      .insert({
        recipe_id: recipe.id,
        input_item_id: flour.id,
        quantity: 100,
        unit: 'g'
      });
    if (recipeItemError) throw recipeItemError;
    console.log('Created Recipe: 1 Bread = 100g Flour');

    // 2. Initial Stock (Inbound)
    console.log('2. Processing Inbound (1000g Flour)...');
    // Using direct insert for simplicity, simulating inbound logic
    await supabase
      .from('inventory')
      .insert({
        store_id: store.id,
        item_id: flour.id,
        theoretical_quantity: 1000,
        physical_quantity: 1000
      });
    
    // Verify Initial Stock
    const { data: initialStock } = await supabase
      .from('inventory')
      .select('theoretical_quantity')
      .eq('item_id', flour.id)
      .single();
    console.log('Initial Flour Stock:', initialStock.theoretical_quantity);

    // 3. Simulate Sale (Sell 2 Breads)
    console.log('3. Simulating Sale (2 Breads)...');
    
    // --- Logic from sales-actions.ts ---
    const itemsToSell = [{ itemId: bread.id, quantity: 2 }];
    
    // Create Sale Record
    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .insert({
        store_id: store.id,
        sale_date: new Date().toISOString().split('T')[0],
        total_amount: 10000,
        channel: 'pos'
      })
      .select()
      .single();
    if (saleError) throw saleError;

    // Create Sale Items
    const saleItems = itemsToSell.map((item) => ({
      sale_id: saleData.id,
      item_id: item.itemId,
      quantity: item.quantity,
    }));
    const { error: itemsError } = await supabase.from('sales_items').insert(saleItems);
    if (itemsError) throw itemsError;

    // Process Inventory Deduction (The Core Logic)
    await processSaleInventory(supabase, store.id, saleData.id, itemsToSell);
    // -----------------------------------

    console.log('Sale processed.');

    // 4. Verify Stock Deduction
    console.log('4. Verifying Stock Deduction...');
    const { data: finalStock } = await supabase
      .from('inventory')
      .select('theoretical_quantity')
      .eq('item_id', flour.id)
      .single();
    
    console.log('Final Flour Stock:', finalStock.theoretical_quantity);
    
    const expectedStock = 1000 - (100 * 2); // 1000 - 200 = 800
    if (finalStock.theoretical_quantity === expectedStock) {
      console.log('SUCCESS: Stock updated correctly!');
    } else {
      console.error(`FAILURE: Expected ${expectedStock}, got ${finalStock.theoretical_quantity}`);
    }

    // Check Transaction Log
    const { data: transactions } = await supabase
      .from('inventory_transactions')
      .select('*')
      .eq('store_id', store.id)
      .eq('item_id', flour.id)
      .order('created_at', { ascending: false });
    
    console.log('Transaction Log:', transactions.length > 0 ? 'Found' : 'Not Found');
    if (transactions.length > 0) {
      console.log('Latest Transaction:', transactions[0].notes, transactions[0].quantity);
    }

    // Cleanup (Optional)
    console.log('Cleaning up test data...');
    await supabase.from('organizations').delete().eq('id', org.id); // Cascade delete should handle the rest
    console.log('Cleanup done.');

  } catch (err) {
    console.error('Test Failed:', err);
  }
}

// --- Helper Functions from sales-actions.ts ---

async function processSaleInventory(supabase, storeId, saleId, items) {
  for (const item of items) {
    const { data: product } = await supabase
      .from('items')
      .select('name')
      .eq('id', item.itemId)
      .single();
    
    const productName = product?.name || 'Unknown Product';

    const { data: recipe } = await supabase
      .from('recipes')
      .select('id, output_quantity')
      .eq('output_item_id', item.itemId)
      .eq('is_active', true)
      .maybeSingle();

    if (recipe) {
      const { data: ingredients } = await supabase
        .from('recipe_items')
        .select('input_item_id, quantity, unit')
        .eq('recipe_id', recipe.id);

      if (ingredients && ingredients.length > 0) {
        for (const ing of ingredients) {
          const deductionQty = (ing.quantity * item.quantity) / recipe.output_quantity;
          await updateInventory(
            supabase, 
            storeId, 
            ing.input_item_id, 
            deductionQty, 
            ing.unit, 
            saleId, 
            'sale',
            `Sale of ${productName} (Qty: ${item.quantity}) - Ingredient Deduction`
          );
        }
      }
    } else {
      const { data: itemInfo } = await supabase
        .from('items')
        .select('is_inventory_managed, base_unit')
        .eq('id', item.itemId)
        .single();
      
      if (itemInfo && itemInfo.is_inventory_managed) {
        await updateInventory(
          supabase, 
          storeId, 
          item.itemId, 
          item.quantity, 
          itemInfo.base_unit, 
          saleId, 
          'sale',
          `Sale of ${productName} (Qty: ${item.quantity}) - Direct Deduction`
        );
      }
    }
  }
}

async function updateInventory(supabase, storeId, itemId, quantity, unit, referenceId, type, notes) {
  const { data: inventory } = await supabase
    .from('inventory')
    .select('id, theoretical_quantity')
    .eq('store_id', storeId)
    .eq('item_id', itemId)
    .maybeSingle();

  if (inventory) {
    const newQty = inventory.theoretical_quantity - quantity;
    await supabase
      .from('inventory')
      .update({ 
        theoretical_quantity: newQty,
        last_updated_at: new Date().toISOString() 
      })
      .eq('id', inventory.id);
  } else {
    await supabase
      .from('inventory')
      .insert({
        store_id: storeId,
        item_id: itemId,
        theoretical_quantity: -quantity,
        physical_quantity: 0
      });
  }

  await supabase
    .from('inventory_transactions')
    .insert({
      store_id: storeId,
      item_id: itemId,
      transaction_type: type,
      quantity: -quantity,
      unit: unit,
      reference_type: 'sale',
      reference_id: referenceId,
      transaction_date: new Date().toISOString().split('T')[0],
      notes: notes
    });
}

runTest();