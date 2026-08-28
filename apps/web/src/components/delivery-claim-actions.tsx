import { confirmDeliveryAction, rejectDeliveryClaimAction } from "@/lib/actions";

export function DeliveryClaimActions({
  taskId,
  matrixId,
}: {
  taskId: string;
  matrixId: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <form action={confirmDeliveryAction}>
        <input type="hidden" name="taskId" value={taskId} />
        <input type="hidden" name="matrixId" value={matrixId} />
        <button type="submit" className="bg-[#0f3d3e] px-3 py-1.5 text-sm text-[#fbfaf6]">
          Confirmar entrega
        </button>
      </form>
      <form action={rejectDeliveryClaimAction}>
        <input type="hidden" name="taskId" value={taskId} />
        <input type="hidden" name="matrixId" value={matrixId} />
        <button type="submit" className="border border-[#0f3d3e] px-3 py-1.5 text-sm text-[#0f3d3e]">
          Ainda não — voltar para andamento
        </button>
      </form>
    </div>
  );
}
