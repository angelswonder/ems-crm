import { useState } from "react";
import { Badge } from "./ui/badge";
import { ConsumptionChart } from "./ConsumptionChart";
import { DemandChart } from "./DemandChart";
import { EnergyParameters } from "./EnergyParameters";
import { EnhancedFilterSection } from "./EnhancedFilterSection";
import { useApp } from "../contexts/AppContext";
import { useAuth } from "../contexts/AuthContext";

export function Dashboard() {
  const { locations } = useApp();
  const { profile } = useAuth();
  const currentUser = profile ? { name: profile.full_name, initials: profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase() } : null;

  const [selectedFilterType, setSelectedFilterType] = useState<"device" | "virtual-group">("device");
  const [selectedDevice, setSelectedDevice] = useState("device-1");
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [dataMode, setDataMode] = useState("real-time");
  const [selectedDay, setSelectedDay] = useState("today");
  const [appliedFilters, setAppliedFilters] = useState({
    selectedFilterType,
    selectedDevice,
    selectedDevices,
    dataMode,
    selectedDay,
  });

  const handleApplyFilters = () => {
    const payload = {
      selectedFilterType,
      selectedDevice,
      selectedDevices,
      dataMode,
      selectedDay,
    };
    setAppliedFilters(payload);
  };

  const handleFilterTypeChange = (type: "device" | "virtual-group") => {
    setSelectedFilterType(type);
    if (type === "device") {
      setSelectedDevice("device-1");
      setSelectedDevices([]);
    } else {
      setSelectedDevice("group-production");
      setSelectedDevices([]);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f8faf9" }}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                Hello, {currentUser?.name ?? "User"}! 👋
              </h1>
              <p className="text-muted-foreground mt-1">What are you looking for today?</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-primary/10 text-primary border-primary/20 px-3 py-1.5">
                <div className="w-2 h-2 bg-primary rounded-full mr-2 animate-pulse" />
                Real-time monitoring active
              </Badge>
            </div>
          </div>
        </div>

        {/* Filter Section */}
        <EnhancedFilterSection
          selectedFilterType={selectedFilterType}
          selectedDevice={selectedDevice}
          selectedDevices={selectedDevices}
          dataMode={dataMode}
          selectedDay={selectedDay}
          locations={locations}
          onFilterTypeChange={handleFilterTypeChange}
          onDeviceChange={setSelectedDevice}
          onDevicesChange={setSelectedDevices}
          onDataModeChange={setDataMode}
          onDayChange={setSelectedDay}
          onApplyFilters={handleApplyFilters}
        />

        <div className="rounded-3xl border border-border/30 bg-card/70 p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">
            Showing data for <span className="text-foreground font-semibold">{appliedFilters.selectedFilterType === 'device' ? appliedFilters.selectedDevice : appliedFilters.selectedDevices.length ? appliedFilters.selectedDevices.join(', ') : 'all selected devices'}</span> over <span className="text-foreground font-semibold">{appliedFilters.selectedDay.replace('-', ' ')}</span> in <span className="text-foreground font-semibold">{appliedFilters.dataMode}</span> mode.
          </p>
        </div>

        {/* Energy Parameters */}
        <EnergyParameters
          dataMode={appliedFilters.dataMode}
          selectedDevice={appliedFilters.selectedFilterType === "device" ? appliedFilters.selectedDevice : appliedFilters.selectedDevices.join(",")}
        />

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ConsumptionChart
            selectedDay={appliedFilters.selectedDay}
            selectedDevice={appliedFilters.selectedFilterType === "device" ? appliedFilters.selectedDevice : appliedFilters.selectedDevices.join(",")}
          />
          <DemandChart dataMode={appliedFilters.dataMode} selectedDay={appliedFilters.selectedDay} />
        </div>
      </div>
    </div>
  );
}
