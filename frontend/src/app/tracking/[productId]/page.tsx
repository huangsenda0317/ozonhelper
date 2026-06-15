import { redirect } from "next/navigation";

export default function LegacyProductDetail({
  params,
}: {
  params: { productId: string };
}) {
  redirect(`/tracking/products/${params.productId}`);
}
