import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Monitor,
  Building,
  Plus,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  HardDrive,
  Cpu,
  Search,
  Check,
  AlertCircle
} from 'lucide-react';
import { Badge, MachineStatusBadge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { ExamRoom, SeatStation, MachineStatus } from '../../types';

export const RoomComputerSetup: React.FC = () => {
  const { rooms, updateMachineStatus, showToast, language } = useApp();
  const isThai = language === 'th';

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(rooms[0]?.id || null);
  const [selectedSeat, setSelectedSeat] = useState<SeatStation | null>(null);
  const [editingStatus, setEditingStatus] = useState<MachineStatus>('online');

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) || rooms[0];

  const handleOpenSeatDetail = (seat: SeatStation) => {
    setSelectedSeat(seat);
    setEditingStatus(seat.status);
  };

  const handleSaveMachineStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeat || !selectedRoom) return;

    updateMachineStatus(selectedRoom.id, selectedSeat.seatNo, editingStatus);
    showToast(
      isThai ? 'อัปเดตเครื่องคอมพิวเตอร์แล้ว' : 'Workstation Updated',
      isThai
        ? `ที่นั่ง ${selectedSeat.seatNo} ถูกตั้งสถานะเป็น ${
            editingStatus === 'online'
              ? 'ออนไลน์'
              : editingStatus === 'offline'
              ? 'ออฟไลน์'
              : editingStatus === 'damaged'
              ? 'ชำรุด'
              : 'ไม่พร้อมใช้งาน'
          } ${
            editingStatus === 'damaged' || editingStatus === 'unavailable'
              ? '(เครื่องนี้จะถูกยกเว้นจากการจัดที่นั่งอัตโนมัติ)'
              : ''
          }`
        : `Seat ${selectedSeat.seatNo} status set to ${editingStatus.toUpperCase()}.${
            editingStatus === 'damaged' || editingStatus === 'unavailable'
              ? ' Machine excluded from auto-seating.'
              : ''
          }`,
      'info'
    );
    setSelectedSeat(null);
  };

  const rows = ['A', 'B', 'C', 'D', 'E'];
  const columns = Array.from({ length: selectedRoom.columns || 8 }, (_, i) => i + 1);

  const getStatusLabel = (st: MachineStatus) => {
    if (!isThai) return st;
    switch (st) {
      case 'online':
        return 'ออนไลน์';
      case 'offline':
        return 'ออฟไลน์';
      case 'damaged':
        return 'ชำรุด';
      case 'unavailable':
        return 'ไม่พร้อมใช้งาน';
      default:
        return st;
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-200 gap-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
            {isThai ? 'โครงสร้างพื้นฐานฮาร์ดแวร์ (A4 & A5)' : 'Hardware Infrastructure (A4 & A5)'}
          </span>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">
            {isThai ? 'ตั้งค่าห้องสอบ & เครื่องคอมพิวเตอร์' : 'Exam Room & Computer Setup'}
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {isThai
              ? 'กำหนดผังห้องปฏิบัติการ, กำหนด Static IP และ MAC address ของอุปกรณ์, และทำเครื่องหมายเครื่องที่ชำรุด'
              : 'Configure laboratory layouts, assign static IP and MAC hardware bindings, and flag damaged equipment.'}
          </p>
        </div>

        {/* Room Tab Selector */}
        <div className="flex items-center gap-2">
          {rooms.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedRoomId(r.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                selectedRoom.id === r.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {r.labName}
            </button>
          ))}
        </div>
      </div>

      {/* Room Overview Summary */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">{selectedRoom.labName}</h2>
              <Badge variant="neutral">
                {selectedRoom.building}, {isThai ? 'ชั้น ' : 'Floor '}
                {selectedRoom.floor}
              </Badge>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {isThai ? 'ความจุ: ' : 'Capacity: '}
              {selectedRoom.seats.length} {isThai ? 'เครื่อง' : 'Stations'} ({selectedRoom.rows}{' '}
              {isThai ? 'แถว' : 'Rows'} × {selectedRoom.columns} {isThai ? 'คอลัมน์' : 'Columns'})
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              {selectedRoom.seats.filter((s) => s.status === 'online').length} {isThai ? 'ออนไลน์' : 'Online'}
            </span>
            <span className="text-red-700 font-semibold bg-red-50 px-2.5 py-1 rounded-lg border border-red-200">
              {selectedRoom.seats.filter((s) => s.status === 'damaged').length} {isThai ? 'ชำรุด' : 'Damaged'}
            </span>
            <span className="text-amber-700 font-semibold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
              {selectedRoom.seats.filter((s) => s.status === 'unavailable').length} {isThai ? 'ไม่พร้อมใช้งาน' : 'Unavailable'}
            </span>
          </div>
        </div>

        {/* Visual Hardware Grid (Screen A5) */}
        <div className="mt-6">
          <div className="mb-4 p-2 rounded-xl bg-slate-100 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
            {isThai
              ? '— แท่นอาจารย์ด้านหน้าห้อง & แผงสวิตช์เครือข่าย —'
              : '— LABORATORY FRONT PODIUM & ETHERNET SWITCH PANEL —'}
          </div>

          <div className="space-y-3">
            {rows.map((rowLetter) => (
              <div key={rowLetter} className="flex items-center gap-2">
                <span className="w-6 font-bold text-gray-500 text-xs font-mono text-center">
                  {rowLetter}
                </span>

                <div className="grid grid-cols-8 gap-2.5 flex-1">
                  {columns.map((colNum) => {
                    const seatNo = `${rowLetter}${colNum}`;
                    const station = selectedRoom?.seats?.find((s) => s.seatNo === seatNo);

                    let bgClass = 'bg-white border-gray-200 hover:border-blue-400';
                    if (station?.status === 'damaged') bgClass = 'bg-red-50 border-red-300 text-red-900';
                    else if (station?.status === 'unavailable') bgClass = 'bg-amber-50 border-amber-300 text-amber-900';
                    else if (station?.status === 'offline') bgClass = 'bg-gray-100 border-gray-300 text-gray-600';
                    else if (station?.status === 'online') bgClass = 'bg-emerald-50/50 border-emerald-200 text-emerald-950';

                    return (
                      <div
                        key={seatNo}
                        onClick={() => station && handleOpenSeatDetail(station)}
                        className={`p-2 rounded-xl border text-center cursor-pointer transition-all hover:shadow-xs min-h-[64px] flex flex-col justify-between ${bgClass}`}
                      >
                        <div className="flex items-center justify-between text-[11px] font-mono font-bold">
                          <span>{seatNo}</span>
                          {station?.status === 'damaged' ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                          ) : station?.status === 'online' ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                          )}
                        </div>

                        <span className="text-[10px] font-mono text-gray-500 truncate mt-1">
                          {station?.machineNo || 'PC'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MACHINE EDIT MODAL */}
      <Modal
        isOpen={!!selectedSeat}
        onClose={() => setSelectedSeat(null)}
        title={
          isThai
            ? `คุณสมบัติฮาร์ดแวร์เครื่องคอมพิวเตอร์: ที่นั่ง ${selectedSeat?.seatNo}`
            : `Workstation Hardware Properties: Seat ${selectedSeat?.seatNo}`
        }
        maxWidth="md"
      >
        {selectedSeat && (
          <form onSubmit={handleSaveMachineStatus} className="space-y-4 text-left text-xs">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">{isThai ? 'หมายเลขเครื่อง (Machine ID):' : 'Machine Identifier:'}</span>
                <span className="font-mono font-bold text-gray-900">{selectedSeat.machineNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{isThai ? 'หมายเลขไอพี Static IPv4:' : 'Static IPv4 Address:'}</span>
                <span className="font-mono text-blue-700 font-bold">{selectedSeat.ip}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{isThai ? 'แอดเดรสฮาร์ดแวร์ Physical MAC:' : 'Physical MAC Address:'}</span>
                <span className="font-mono text-gray-700">{selectedSeat.mac}</span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-2">
                {isThai ? 'สถานะการทำงานของฮาร์ดแวร์' : 'Operational Hardware Status'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['online', 'offline', 'damaged', 'unavailable'] as MachineStatus[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setEditingStatus(st)}
                    className={`py-2 px-3 rounded-xl font-bold border capitalize transition-colors cursor-pointer ${
                      editingStatus === st
                        ? st === 'damaged'
                          ? 'bg-red-600 text-white border-red-600'
                          : st === 'unavailable'
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-blue-600 text-white border-blue-600'
                        : 'bg-gray-50 border-gray-300 text-gray-700'
                    }`}
                  >
                    {getStatusLabel(st)}
                  </button>
                ))}
              </div>
            </div>

            {(editingStatus === 'damaged' || editingStatus === 'unavailable') && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
                <strong>{isThai ? 'ผลกระทบต่อการจัดที่นั่ง: ' : 'Seating Impact: '}</strong>
                {isThai
                  ? `การระบุสถานะเป็น "${getStatusLabel(editingStatus)}" จะป้องกันไม่ให้ระบบจัดนักศึกษามานั่งที่เครื่องนี้โดยอัตโนมัติ (T4)`
                  : `Marking this station as ${editingStatus.toUpperCase()} will automatically prevent instructors from placing students here during auto-assignment (T4).`}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setSelectedSeat(null)}
                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-semibold text-xs hover:bg-gray-50 cursor-pointer"
              >
                {isThai ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md cursor-pointer"
              >
                {isThai ? 'บันทึกคุณสมบัติ' : 'Save Properties'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
