import { CotizadorApp } from "@/components/CotizadorApp";
import { ProductionUiPatch } from "@/components/ProductionUiPatch";

export default function Home() {
  return (
    <>
      <ProductionUiPatch />
      <CotizadorApp />
    </>
  );
}
