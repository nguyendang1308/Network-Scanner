export interface Device {
  id: number;
  mac: string | null;
  ip: string;
  hostname: string | null;
  vendor: string | null;
  os_guess: string | null;
  is_online: boolean;
  first_seen: string | null;
  last_seen: string | null;
  x?: number;
  y?: number;
}

export interface Network {
  id: number;
  cidr: string;
  gateway_ip: string | null;
  interface_name: string | null;
  ssid: string | null;
}

export interface Snapshot {
  id: number;
  network_id: number;
  captured_at: string;
  topology_json: string;
}

export interface SnapshotTopology {
  timestamp: string;
  devices: Device[];
  edges: unknown[];
}

export interface DiffResult {
  added: Device[];
  removed: Device[];
  changed: { current: Device; previous: Device }[];
}

export interface WSEvent {
  event: 'scan_start' | 'scan_progress' | 'scan_complete' | 'new_device' | 'device_offline' | 'device_online'
  percent?: number
  devices_found?: number
  error?: string
  device?: Device
  mac?: string
}

export interface NotificationEvent {
  event: string
  payload: unknown
  timestamp: string
}

export interface Toast {
  id: string
  title: string
  message: string
  type: 'success' | 'warning' | 'info'
  mac?: string | null
}
