export type CivilDate = string;

export type MaterializedFixedDate = {
  originalDueDate: CivilDate;
  currentDueDate: CivilDate;
  waitingForTrigger: false;
};

export function materializeFixedDate(
  fixedDate: CivilDate,
  previous?: { originalDueDate: CivilDate; currentDueDate: CivilDate },
): MaterializedFixedDate {
  return {
    originalDueDate: previous?.originalDueDate ?? fixedDate,
    currentDueDate: previous?.currentDueDate ?? fixedDate,
    waitingForTrigger: false,
  };
}
