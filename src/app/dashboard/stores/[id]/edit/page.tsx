import { getStore } from "@/app/dashboard/stores/actions";
import { StoreEditForm } from "./store-edit-form";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditStorePage(props: PageProps) {
  const params = await props.params;
  const store = await getStore(params.id);

  if (!store) {
    notFound();
  }

  return <StoreEditForm store={store} />;
}