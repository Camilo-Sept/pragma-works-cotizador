import { CotizadorApp } from "@/components/CotizadorApp";
import { ProductionMenuController } from "@/components/ProductionMenuController";

export default function Home() {
  return (
    <>
      <ProductionMenuController />
      <CotizadorApp />
    </>
  );
}
