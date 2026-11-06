/** Gabungkan nama class, buang nilai falsy. Util kecil dipakai di seluruh UI. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
