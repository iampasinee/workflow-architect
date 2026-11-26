import type { RoomState } from '../types/rooms';
import { normalizeRoomCode, seatCode, rowLabel } from './roomState';

export const floorFourCodes = ['B4-01A', 'B4-01B', 'B4-08', 'B4-09', 'B4-11', 'B4-13', 'B4-16'];
const initialRows = 5;
const initialColumns = 8;

export function initializeFixedRooms(previous: RoomState): RoomState {
  if (previous.fixedFloorFour) return previous;
  const state = structuredClone(previous);
  let floor = state.floors.find((item) => item.floorNumber === 4);
  if (!floor) {
    floor = { id: 'floor_fixed_4', floorNumber: 4, status: 'active' };
    state.floors.push(floor);
  }
  floor.status = 'active';
  const demoNames = ['LAB 301', 'LAB 405'];
  for (const [index, code] of floorFourCodes.entries()) {
    let physical = state.physicalRooms.find((item) => item.floorId === floor.id && normalizeRoomCode(item.roomCode) === code);
    const demo = state.rooms.find((item) => item.id === ['room_0001', 'room_0002'][index]);
    const demoPhysical = demo && state.physicalRooms.find((item) => item.id === demo.physicalRoomId && normalizeRoomCode(item.roomCode) === demoNames[index]);
    const convertingDemo = !physical && Boolean(demoPhysical);
    if (!physical) {
      physical = demoPhysical || { id: 'physical_fixed_' + code, roomCode: code, floorId: floor.id, status: 'active' };
      if (!demoPhysical) state.physicalRooms.push(physical);
      physical.roomCode = code;
      physical.floorId = floor.id;
    }
    let room = state.rooms.find((item) => item.physicalRoomId === physical.id);
    // Keep an administrator's existing room layout and device bindings.
    if (room && !convertingDemo) continue;
    if (room && convertingDemo && (room.rows !== [5, 4][index] || room.columns !== [8, 6][index])) continue;
    if (!room) {
      room = { id: 'room_fixed_' + code, physicalRoomId: physical.id, rows: initialRows, columns: initialColumns, status: 'ready' };
      state.rooms.push(room);
    }
    room.rows = initialRows;
    room.columns = initialColumns;
    for (let row = 1; row <= initialRows; row++) {
      for (let column = 1; column <= initialColumns; column++) {
        const label = seatCode(row, column);
        if (state.seats.some((seat) => seat.roomId === room.id && seat.row === row && seat.column === column)) continue;
        const seatId = 'seat_fixed_' + code + '_' + label;
        state.seats.push({ id: seatId, roomId: room.id, row, column, seatCode: label, examSeatNo: rowLabel(row) + column });
        const number = (row - 1) * initialColumns + column;
        // Locally administered addresses for simulated machines only.
        let slot = index * initialRows * initialColumns + number;
        let ipAddress: string;
        let macAddress: string;
        do {
          const network = Math.floor(slot / 250);
          const host = slot % 250 + 1;
          ipAddress = `10.44.${network}.${host}`;
          macAddress = '02:44:00:00:' + [network, host].map((value) => value.toString(16).padStart(2, '0').toUpperCase()).join(':');
          slot++;
        } while (state.computers.some((device) => device.ipAddress === ipAddress || device.macAddress === macAddress));
        const base = 'PC-' + code + '-' + label;
        let computerCode = base;
        for (let n = 2; state.computers.some((item) => item.computerCode.toUpperCase() === computerCode); n++) computerCode = base + '-' + n;
        state.computers.push({ id: 'device_fixed_' + code + '_' + label, computerCode, serialNumber: '', ipAddress, macAddress, seatId, status: 'ready', machineStatus: 'online' });
      }
    }
  }
  state.fixedFloorFour = true;
  return state;
}

// Keep legacy records in storage for historical exams, outside the managed inventory.
export function managedFloorFour(state: RoomState): RoomState {
  const floors = state.floors.filter((item) => item.floorNumber === 4);
  const physicalRooms = state.physicalRooms.filter((item) => floors.some((floor) => floor.id === item.floorId)
    && floorFourCodes.includes(normalizeRoomCode(item.roomCode))).sort((a, b) => a.roomCode.localeCompare(b.roomCode));
  const rooms = state.rooms.filter((item) => physicalRooms.some((physical) => physical.id === item.physicalRoomId));
  const seats = state.seats.filter((seat) => rooms.some((room) => room.id === seat.roomId));
  const ids = new Set(seats.map((seat) => seat.id));
  return { ...state, floors, physicalRooms, rooms, seats, computers: state.computers.filter((device) => !device.seatId || ids.has(device.seatId)) };
}
