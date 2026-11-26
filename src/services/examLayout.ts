import type { Room, SeatBinding } from '../types';

export interface ExamLayout {
  firstRow: number;
  rows: number;
  columns: number;
}

export const fullLayout = (room: Room): ExamLayout => ({ firstRow: 1, rows: room.rows, columns: room.columns });

export const validLayout = (layout: ExamLayout, room: Room) =>
  Object.values(layout).every((value) => Number.isSafeInteger(value) && value >= 1) &&
  layout.firstRow + layout.rows - 1 <= room.rows && layout.columns <= room.columns;

export const layoutsOverlap = (left?: ExamLayout, right?: ExamLayout) =>
  !left || !right || (left.firstRow < right.firstRow + right.rows && right.firstRow < left.firstRow + left.rows);

export const seatsInLayout = (room: Room, layout?: ExamLayout): SeatBinding[] => {
  if (!layout) return room.seats;
  return room.seats.filter((seat) => {
    const match = /^([A-Z]+)(\d+)$/i.exec(seat.seatNo);
    if (!match) return false;
    const row = [...match[1].toUpperCase()].reduce((n, letter) => n * 26 + letter.charCodeAt(0) - 64, 0);
    return row >= layout.firstRow && row < layout.firstRow + layout.rows && Number(match[2]) <= layout.columns;
  });
};

export const availableExamSeats = (room: Room, layout?: ExamLayout) =>
  seatsInLayout(room, layout).filter((seat) => seat.status === 'online' && !seat.disabled && seat.machineNo);

