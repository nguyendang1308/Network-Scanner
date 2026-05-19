# NetMapper

Network Topology Visualizer — quét LAN/WiFi và hiển thị thiết bị dưới dạng đồ thị tương tác (tương tự GNS3).

![NetMapper Dashboard](screenshot/image.png)

## Tính năng

- **ARP Scanning**: Quét mạng bằng gói ARP với Scapy, tự động phát hiện thiết bị.
- **OUI Lookup**: Tra cứu nhà sản xuất (vendor) từ địa chỉ MAC dựa trên database Wireshark.
- **Topology Graph**: Hiển thị thiết bị dưới dạng node tương tác với React Flow.
- **Snapshot History**: Lưu lịch sử topology, so sánh diff giữa các thờì điểm.
- **Realtime WebSocket**: Cập nhật trực tiếp khi có thiết bị mới / mất kết nối.
- **Notification Toast**: Thông báo popup khi phát hiện thay đổi mạng.

## Kiến trúc

```
.
├── backend/          FastAPI + SQLAlchemy 2.0 (async) + SQLite
│   ├── app/
│   │   ├── api/      REST API & WebSocket
│   │   ├── scanner/  ARP scanner, OUI lookup, enricher
│   │   └── ...
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/         React 18 + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/  TopologyGraph, DeviceNode, SnapshotTimeline, ...
│   │   ├── hooks/       useWebSocket
│   │   └── ...
│   ├── Dockerfile
│   └── package.json
└── docker-compose.yml
```

## Yêu cầu

- Docker + Docker Compose
- (Tùy chọn) Node.js 20+ nếu chạy frontend standalone
- (Tùy chọn) Python 3.11+ nếu chạy backend standalone

## Cài đặt & Chạy

### Bằng Docker Compose (khuyến nghị)

```bash
docker compose up --build
```

- **Frontend**: http://localhost:5173
- **Backend API docs**: http://localhost:8000/docs
- **Backend health**: http://localhost:8000/health

### Backend standalone (dùng uv)

```bash
cd backend
# Cài uv: https://docs.astral.sh/uv/getting-started/installation/
uv venv
uv pip install -r pyproject.toml
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend standalone

```bash
cd frontend
npm install
npm run dev
```

## Sử dụng

### 1. Chế độ Live

- Tab **Live** hiển thị topology thờì gian thực.
- Nhấn **Scan Now** để quét thủ công.
- WebSocket tự động cập nhật khi có thiết bị mới / offline.
- Biểu tượng chuông (🔔) hiển thị thông báo gần đây.
- Nút loa (🔊) bật/tắt âm thanh cảnh báo (mặc định tắt).

### 2. Chế độ History

- Tab **History** xem lại snapshot đã lưu.
- Click snapshot để xem topology tại thờì điểm đó.
- Chế độ **Compare**: chọn 2 snapshot để so sánh diff.
  - Xanh lá = thiết bị mới
  - Đỏ = thiết bị mất
  - Vàng = thiết bị thay đổi (IP, hostname, vendor, ...)

### 3. API chính

| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/api/devices` | GET | Danh sách thiết bị |
| `/api/networks/{id}/scan` | POST | Kích hoạt quét thủ công |
| `/api/snapshots` | GET | Danh sách snapshot |
| `/api/snapshots/latest` | GET | Snapshot gần nhất |
| `/api/snapshots/{id}/diff` | GET | So sánh 2 snapshot |
| `/api/notifications` | GET | Lịch sử sự kiện |
| `/ws/network/{id}` | WS | WebSocket realtime |

### 4. Cấu hình

Chỉnh sửa `backend/app/config.py` hoặc set environment variables:

| Biến | Mặc định | Mô tả |
|------|----------|-------|
| `SCAN_INTERVAL_SECONDS` | 300 | Chu kỳ quét tự động (giây) |
| `DATABASE_URL` | `sqlite+aiosqlite:///app/data/netmapper.db` | URL database |
| `WEBHOOK_URL` | `None` | URL webhook khi phát hiện thiết bị mới |

## Lưu ý

- Backend container cần `cap_add: [NET_RAW]` và `network_mode: host` để gửi gói ARP.
- Trên Windows/macOS, `network_mode: host` có thể hoạt động khác so với Linux.
- Nếu không có quyền `NET_RAW`, scanner sẽ log warning và trả về danh sách rỗng.

## Giấy phép

Xem file [LICENSE](LICENSE).

## Tác giả

Đặng Văn Anh Nguyên
