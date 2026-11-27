# StreamXT Cloud Streaming Performance Evaluation

Comparison of **Browser-Encoded Streaming** vs. **Headless Cloud Compositor + FFmpeg `tee` Multistreaming**.

---

## 1. Client PC Impact (User Device Workload)

| Workload on User's PC | Browser-Encoded Mode | Headless Cloud Compositor | Improvement |
| :--- | :--- | :--- | :--- |
| **1280×720 / 1080p Canvas Compositing** | Runs at 30–60fps on client CPU/GPU (`canvasRenderer.js`) | Offloaded to cloud Chromium | **~100% compositing CPU saved on client** |
| **Video Encoding (`MediaRecorder` VP8)** | Browser software/hybrid VP8 encode on client | **Eliminated** (lightweight WebRTC camera send only) | **Removes client encode lag & frame drops** |
| **Upload Bandwidth (1 destination)** | `2.5–4.5 Mbps` constant WebM upload | Adaptive WebRTC (`~1–2.5 Mbps`, or `~50 kbps` audio-only) | **Lower + adaptive upload** |
| **Upload Bandwidth (3 destinations)** | `3×` if pushed from client (`7.5–13.5 Mbps`) | **Same single WebRTC feed** (`0` extra upload) | **3× less client bandwidth** |
| **Wi-Fi Blip / Browser Refresh** | RTMP pipe closes → YouTube broadcast terminates | Cloud compositor keeps RTMP alive with *"BRB"* card | **Broadcast survives disconnects** |

### Why This Matters for the USP
A low-end laptop, Chromebook, or mobile device only needs to run a lightweight WebRTC call (using the device's built-in hardware video codec), while the cloud worker handles scene compositing, overlays, tickers, polls, guest mixing, encoding, and multistream fan-out.

---

## 2. Server-Side Benchmark (FFmpeg Single vs Separate vs `tee` Muxer)

Measured locally using `ffmpeg 8.1.2` encoding 5 seconds of `1280×720 @ 30fps` (`libx264 -preset veryfast -tune zerolatency`, `2500k` video + `128k` AAC audio), producing identical `611,941`-byte FLV outputs:

| Server Encoding Strategy | Total CPU Time (`TotalProcessorTime`) | Output Size | Relative Server CPU |
| :--- | :---: | :---: | :---: |
| **1 Destination (Single FFmpeg)** | `4,078 ms` (`0.91s` wall, `5.49x` speed) | `1 × 611,941 B` | `1.00×` |
| **3 Destinations (3 Separate FFmpegs)** | `13,359 ms` | `3 × 611,941 B` | `3.28×` |
| **3 Destinations (1 FFmpeg `tee` Muxer)** | `4,250 ms` (`1.11s` wall, `4.47x` speed) | `3 × 611,941 B` | **`1.04×` (~68% CPU saved)** |

### Key Takeaway
FFmpeg's `tee` muxer encodes the video and audio **once** and writes identical FLV packets to all RTMP destinations (`[f=flv:onfail=ignore]`), delivering **3.14× lower CPU usage** for 3 simultaneous destinations (`4,250 ms` vs `13,359 ms`)—only `+4.2%` overhead compared to streaming to a single destination.

---

## 3. Cloud Architecture Trade-Offs

1. **Cloud Compute & Memory Cost:**
   - Each live cloud-composited stream runs 1 Headless Chromium instance + 1 FFmpeg worker (typically ~400–700 MB RAM and ~1–2 vCPU on CPU encoding, or substantially less CPU with GPU `h264_nvenc`).
   - Keeping **Cloud Compositor** as the default (with **Browser Encode** available as a fallback mode in Studio Settings) gives flexibility across free vs. pro tiers.
2. **Glass-to-Glass Latency:**
   - Adds ~1–2 seconds of extra delay (WebRTC → Cloud Chromium → FFmpeg → RTMP), which is standard for cloud broadcast studios and transparent to live viewers.
3. **Stream Stability:**
   - Cloud workers run with predictable CPU, codecs, and network uplink, decoupling broadcast quality from the host's hardware.
