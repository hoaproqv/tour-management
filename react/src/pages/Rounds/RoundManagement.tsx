import React, { useCallback, useEffect, useMemo, useState } from "react";

import {
  DeleteOutlined,
  FileExcelOutlined,
  EditOutlined,
} from "@ant-design/icons";
import { arrayMove } from "@dnd-kit/sortable";
import { Button, Card, Form, Input, Select, Typography, Tabs } from "antd";
import dayjs from "dayjs";

import { useGetAccountInfo } from "../../hooks/useAuth";
import { useDebounce } from "../../hooks/useDebounce";
import { useGlobalTripFilter } from "../../hooks/useGlobalTripFilter";
import { canManageCatalog, removeAccents } from "../../utils/helper";

import RoundFormModal, {
  type RoundFormValues,
} from "./components/RoundFormModal";
import { RoundTable } from "./components/RoundTable";
import { useRoundData } from "./hooks/useRoundData";
import { statusMeta } from "./utils/constants";
import { validateTripRounds } from "./utils/validation";

import type { RoundItem, Trip } from "../../api/trips";
import type { IUser } from "../../utils/types";
import type { DragEndEvent } from "@dnd-kit/core";

const { Title, Text } = Typography;

export default function RoundManagement() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState<RoundItem["status"] | "all">(
    "all",
  );
  const [showCreate, setShowCreate] = useState(false);
  const [editingRound, setEditingRound] = useState<RoundItem | null>(null);
  const [localRounds, setLocalRounds] = useState<RoundItem[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isEditingAll, setIsEditingAll] = useState(false);
  const [activeTabDay, setActiveTabDay] = useState<string>("");

  const [form] = Form.useForm<RoundFormValues>();
  const { data: accountInfo } = useGetAccountInfo();
  const currentUser = accountInfo as IUser | undefined;
  const canManage = canManageCatalog(currentUser);

  const {
    trips: originalTrips,
    tripBuses,
    rounds,
    isLoading,
    reorderMutation,
    createMutation,
    updateMutation,
    deleteMutation,
    handleExport,
    handleBulkDelete,
    createRound,
  } = useRoundData();

  const trips = useMemo(() => {
    return [...originalTrips].sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeB - timeA;
    });
  }, [originalTrips]);

  const [tripFilter, setTripFilter] = useGlobalTripFilter(true);

  const tripBusesArray = useMemo(
    () => (Array.isArray(tripBuses) ? tripBuses : []),
    [tripBuses],
  );

  const activeTripObj = useMemo(
    () => trips.find((t) => String(t.id) === String(tripFilter)),
    [trips, tripFilter],
  );

  const tripDays = useMemo(() => {
    if (!activeTripObj) return [];
    if (!activeTripObj.start_date || !activeTripObj.end_date) return [];
    const start = dayjs(activeTripObj.start_date);
    const end = dayjs(activeTripObj.end_date);
    const days: string[] = [];
    let current = start;
    while (current.isBefore(end) || current.isSame(end, "day")) {
      days.push(current.format("YYYY-MM-DD"));
      current = current.add(1, "day");
    }
    return days;
  }, [activeTripObj]);

  useEffect(() => {
    if (
      tripDays.length > 0 &&
      (!activeTabDay || !tripDays.includes(activeTabDay))
    ) {
      setActiveTabDay(tripDays[0]);
    } else if (tripDays.length === 0) {
      setActiveTabDay("");
    }
  }, [tripDays, activeTabDay]);

  useEffect(() => {
    if (rounds.length > 0) {
      setLocalRounds(rounds);
    } else {
      setLocalRounds([]);
    }
  }, [rounds]);

  const tripDefaultBusMap = useMemo(() => {
    const map = new Map<number, number[]>();
    for (const tb of tripBusesArray) {
      const tId = tb.trip;
      const bId = tb.bus;
      const current = map.get(tId) || [];
      if (!current.includes(bId)) {
        current.push(bId);
      }
      map.set(tId, current);
    }
    return map;
  }, [tripBusesArray]);

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      setLocalRounds((prev) => {
        const oldIndex = prev.findIndex(
          (r) => String(r.id) === String(active.id),
        );
        const overIndex = prev.findIndex(
          (r) => String(r.id) === String(over.id),
        );

        if (oldIndex === -1 || overIndex === -1) return prev;

        const maxDoingSequence = prev
          .filter(
            (r) =>
              r.round_date === activeTabDay &&
              (r.status === "doing" || r.status === "done"),
          )
          .reduce((max, r) => Math.max(max, r.sequence), 0);

        const overItem = prev[overIndex];
        // Cannot drag a planned round above or among doing/done rounds
        if (
          overItem?.round_date === activeTabDay &&
          overItem.sequence <= maxDoingSequence
        ) {
          // Instead of message.warning which triggers side effects inside a reducer-like function,
          // it's better to just return prev. (In a real scenario, you might dispatch a toast elsewhere).
          return prev;
        }

        const newArr = arrayMove(prev, oldIndex, overIndex);
        const activeDayItems = newArr.filter(
          (r) => r.round_date === activeTabDay,
        );
        const otherItems = newArr.filter((r) => r.round_date !== activeTabDay);

        activeDayItems.forEach((item, index) => {
          item.sequence = index + 1;
        });

        return [...otherItems, ...activeDayItems];
      });
    },
    [activeTabDay],
  );

  const displayRounds = useMemo(() => {
    let filtered = localRounds.filter((r) => r.round_date === activeTabDay);
    if (tripFilter && tripFilter !== "all") {
      filtered = filtered.filter((r) => String(r.trip) === tripFilter);
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }
    if (debouncedSearch) {
      const lower = removeAccents(debouncedSearch.toLowerCase());
      filtered = filtered.filter((r) => {
        const n = removeAccents((r.name || "").toLowerCase());
        const l = removeAccents((r.location || "").toLowerCase());
        return n.includes(lower) || l.includes(lower);
      });
    }
    return filtered.sort((a, b) => a.sequence - b.sequence);
  }, [localRounds, tripFilter, statusFilter, debouncedSearch, activeTabDay]);

  const openEdit = useCallback(
    (round: RoundItem) => {
      setEditingRound(round);
      let t = null;
      if (round.estimate_time) {
        const [h, m] = round.estimate_time.split(":");
        t = dayjs().hour(Number(h)).minute(Number(m)).second(0);
      }
      form.setFieldsValue({
        trip: String(round.trip),
        name: round.name,
        location: round.location,
        estimate_date: round.round_date || undefined,
        estimate_time_only: t,
      });
      setShowCreate(true);
    },
    [form],
  );

  const openCreate = () => {
    setEditingRound(null);
    form.resetFields();
    form.setFieldsValue({
      trip: tripFilter && tripFilter !== "all" ? String(tripFilter) : undefined,
      estimate_date: activeTabDay,
    });
    setShowCreate(true);
  };

  const onFinishForm = () => {
    form
      .validateFields()
      .then(async (values) => {
        let finalEstimateTime = null;
        if (values.estimate_time_only) {
          finalEstimateTime = dayjs(values.estimate_time_only).format(
            "HH:mm:ss",
          );
        }

        const payload = {
          trip: String(values.trip),
          name: values.name || "",
          location: values.location || "",
          round_date: values.estimate_date || null,
          estimate_time: finalEstimateTime,
          sequence: editingRound
            ? editingRound.sequence
            : displayRounds.length + 1,
          bus_ids: tripDefaultBusMap.get(Number(values.trip)) || [],
        };

        if (editingRound && String(editingRound.id) !== "mock-1") {
          updateMutation.mutate({ id: String(editingRound.id), payload });
        } else {
          // If sequence 1 doesn't exist, create it first
          const roundsForActiveDay = localRounds.filter(
            (r) => r.round_date === (values.estimate_date || null),
          );
          if (!editingRound && roundsForActiveDay.length === 0) {
            try {
              await createRound({
                trip: String(values.trip),
                name: "Tập trung và xuất phát",
                location: "",
                round_date: values.estimate_date || null,
                estimate_time: null,
                sequence: 1,
                bus_ids: tripDefaultBusMap.get(Number(values.trip)) || [],
              });
            } catch {
              // Ignore if it fails (e.g. unique constraint)
            }
          }
          createMutation.mutate(payload);
        }
        setShowCreate(false);
        setEditingRound(null);
      })
      .catch(() => undefined);
  };

  const handleLockRounds = () => {
    const { isValid, errorDay } = validateTripRounds(
      tripDays,
      localRounds,
      Number(tripFilter),
    );

    if (!isValid && errorDay) {
      setActiveTabDay(errorDay);
      return;
    }

    // Apply sequences
    const diffs: RoundItem[] = [];
    localRounds.forEach((lr) => {
      const orig = rounds.find((r) => String(r.id) === String(lr.id));
      if (orig && orig.sequence !== lr.sequence) {
        diffs.push(lr);
      }
    });
    if (diffs.length > 0) {
      reorderMutation.mutate(
        diffs.map((d) => ({ id: d.id, sequence: d.sequence })),
      );
    }
    setIsEditingAll(false);
  };

  const handleCancelEditRounds = () => {
    setLocalRounds(rounds); // Revert to original
    setIsEditingAll(false);
    setIsSelectionMode(false);
    setSelectedRowKeys([]);
  };

  return (
    <div className="w-full bg-[#f4f7fb] h-full py-6">
      <div className="bg-white shadow-sm rounded-2xl p-6 border border-slate-100">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-2">
          <div className="flex-1 min-w-[250px] pr-4">
            <p className="text-sm uppercase tracking-[0.25em] text-sky-700 font-semibold">
              ROUND MANAGEMENT
            </p>
            <Title level={2} style={{ margin: 0 }}>
              Quản lý Chặng
            </Title>
            <Text type="secondary">
              Quản lý các chặng thuộc chuyến đi và trạng thái thực hiện.
            </Text>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            <Input
              allowClear
              placeholder="Tìm theo tên hoặc địa điểm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-64"
            />
            <Select
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              className="w-full sm:w-48"
              options={[
                { value: "all", label: "Tất cả trạng thái" },
                ...Object.entries(statusMeta).map(([value, meta]) => ({
                  value,
                  label: meta.label,
                })),
              ]}
            />
            {canManage && (
              <Button
                icon={<FileExcelOutlined />}
                onClick={() => {
                  if (!tripFilter) return;
                  handleExport(tripFilter);
                }}
                className="text-emerald-600 border-emerald-200 hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 shadow-sm"
              >
                Export
              </Button>
            )}
            {canManage && (
              <Button
                type="primary"
                onClick={openCreate}
                className="bg-sky-600 hover:bg-sky-700 shadow-sm"
              >
                + Tạo mới
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6 mb-4 p-4 bg-slate-50/50 border border-slate-100 rounded-xl">
          <div className="flex items-center gap-3">
            <span className="font-medium text-slate-700 whitespace-nowrap">
              Chuyến đi:
            </span>
            <Select
              value={
                trips.some((t) => String(t.id) === tripFilter)
                  ? tripFilter
                  : undefined
              }
              onChange={(val) => setTripFilter(val)}
              className="w-full sm:w-64"
              showSearch
              optionFilterProp="label"
              notFoundContent="Không có chuyến đi"
              options={[
                ...trips.map((t: Trip) => ({
                  value: String(t.id),
                  label: t.name,
                })),
              ]}
              placeholder="Chọn chuyến đi"
            />
            {canManage && isEditingAll && (
              <div className="flex gap-2">
                <Button onClick={handleCancelEditRounds}>Hủy</Button>
                <Button type="primary" onClick={handleLockRounds}>
                  Chốt chặng
                </Button>
              </div>
            )}
            {canManage && !isEditingAll && (
              <Button
                type="dashed"
                className="border-blue-400 text-blue-500 hover:text-blue-600 hover:border-blue-500 font-medium"
                icon={<EditOutlined />}
                onClick={() => setIsEditingAll(true)}
              >
                Sửa lịch trình
              </Button>
            )}
          </div>

          {canManage && isEditingAll && (
            <div className="flex justify-end">
              {isSelectionMode ? (
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setIsSelectionMode(false);
                      setSelectedRowKeys([]);
                    }}
                  >
                    Hủy
                  </Button>
                  {selectedRowKeys.length > 0 && (
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => {
                        handleBulkDelete(selectedRowKeys as string[], () => {
                          setSelectedRowKeys([]);
                          setIsSelectionMode(false);
                        });
                      }}
                    >
                      Xóa đã chọn ({selectedRowKeys.length})
                    </Button>
                  )}
                </div>
              ) : (
                <Button danger onClick={() => setIsSelectionMode(true)}>
                  Xóa nhiều
                </Button>
              )}
            </div>
          )}
        </div>

        <Card styles={{ body: { padding: 0 } }}>
          {tripDays.length > 0 && (
            <div className="px-4 pt-4">
              <Tabs
                activeKey={activeTabDay}
                onChange={(key) => setActiveTabDay(key)}
                items={tripDays.map((day) => ({
                  label: dayjs(day).format("DD/MM/YYYY"),
                  key: day,
                }))}
              />
            </div>
          )}
          <RoundTable
            rounds={displayRounds}
            isLoading={isLoading}
            canManage={canManage}
            isEditing={isEditingAll}
            isSelectionMode={isSelectionMode}
            selectedRowKeys={selectedRowKeys}
            setSelectedRowKeys={setSelectedRowKeys}
            onEdit={openEdit}
            onDelete={(id) => deleteMutation.mutate(id)}
            deleteStatus={deleteMutation.status}
            onDragEnd={onDragEnd}
            emptyDescription={
              tripDays.length > 0 ? "Không có lịch trình" : "Chưa có dữ liệu"
            }
          />
        </Card>
      </div>

      <RoundFormModal
        open={showCreate}
        onCancel={() => {
          setShowCreate(false);
          setEditingRound(null);
        }}
        onSubmit={onFinishForm}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        form={form}
        trips={trips}
        editingRound={editingRound}
        tripFilter={
          tripFilter && tripFilter !== "all" ? String(tripFilter) : undefined
        }
      />
    </div>
  );
}
