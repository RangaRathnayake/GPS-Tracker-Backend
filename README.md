# GPS Tracker Backend

SinoTrack ST-901/H02 tracker එකෙන් එන TCP packets console එකේ බැලීමට සරල Node.js server එකකි. මෙය HTTP/Express server එකක් නොවේ. Tracker එක `5013` port එකට raw TCP data යවන නිසා Node.js `net` server එකක් භාවිතා කරයි.

## 1. Server එක ආරම්භ කිරීම

Node.js 18 හෝ අලුත් version එකක් අවශ්‍යයි.

```bash
cd "/Users/rangarathnayake/COAD/GPS/GPS TRACKER/Backend GPS Tracker"
npm start
```

සාර්ථක නම්:

```text
GPS TCP logger listening on 0.0.0.0:5013
Waiting for SinoTrack / H02 packets...
```

## Docker භාවිතයෙන් ආරම්භ කිරීම

Source code එක තිබෙන machine එකේ:


```bash
docker compose up -d --build
docker compose logs -f
```

නතර කිරීමට:

```bash
docker compose down
```

GitHub Container Registry image එක server එකට pull කර සෘජුව run කිරීමට (image name එක repository එකේ Packages/Actions වලින් ලබාගන්න):

```bash
docker pull ghcr.io/GITHUB_USERNAME/gps-tracker-backend:latest
docker run -d \
  --name gps-tracker-backend \
  --restart unless-stopped \
  -p 5013:5013/tcp \
  ghcr.io/GITHUB_USERNAME/gps-tracker-backend:latest
```

Logs බැලීමට:


```bash
docker logs -f gps-tracker-backend
```

Server firewall/security group එකේ inbound `TCP 5013` port එක විවෘත කළ යුතුයි. Public server IP එක tracker එකට දීමට:

```text
8040000 YOUR_SERVER_PUBLIC_IP 5013
```

`main` branch එකට push වන සෑම අවස්ථාවකම `.github/workflows/docker-publish.yml` workflow එක `linux/amd64` සහ `linux/arm64` image build කර GHCR වෙත `latest` සහ commit-SHA tags වලින් publish කරයි.
## 2. ngrok TCP tunnel එක

වෙනත් Terminal window එකක:

```bash
ngrok tcp 5013
```

ngrok මෙවැනි address එකක් පෙන්වයි:

```text
tcp://0.tcp.ap.ngrok.io:12345
```

මෙහි:

- Server/domain: `0.tcp.ap.ngrok.io`
- Port: `12345`

ngrok ලබාදුන් සැබෑ values යොදා tracker SIM එකට SMS එකක් යවන්න:

```text
8040000 0.tcp.ap.ngrok.io 12345
```

ඉන්පසු:

```text
RESTART
```

විනාඩි 1–2කට පසු configuration බලන්න:

```text
RCONF
```

> ngrok free/random TCP address එක නැවත ආරම්භ කරන විට වෙනස් විය හැකියි. එවිට අලුත් host සහ port එක `8040000 ...` command එකෙන් tracker එකට නැවත දිය යුතුයි. ngrok account/plan එක අනුව TCP endpoints සඳහා සීමා තිබිය හැකියි.

## 3. Console output

Connection එකක් සහ packet එකක් ලැබුණු විට:

```text
CONNECT #1 ...
DATA #1 ... bytes
HEX: ...
RAW: *HQ,...#
BASIC: { ... }
```

`RAW` යනු tracker එක එවූ H02 message එකයි. `BASIC` යනු පහසුවෙන් බලන්න සරලව වෙන් කළ supplier, device ID, command සහ fields list එකයි. Tracker එකෙන් JSON එන්නේ නැහැ; JSON output එක server එක විසින් හදන එකකි.

මෙය මුලින් packet ලැබෙනවාද කියා පරීක්ෂා කරන logger එකක් පමණි. Full tracking platform එකක් සඳහා protocol acknowledgements, exact field decoding, database, map/API සහ authentication අවශ්‍ය නිසා Traccar භාවිතා කිරීම වඩා සුදුසුයි.

## 4. SinoTrack default server එකට නැවත යාම

ඔබගේ කලින් configuration එක අනුව:

```text
8040000 45.112.204.246 8090
```

`SET OK` reply එකෙන් පසු:

```text
RESTART
```

ඉන්පසු `RCONF` යවා මෙය තිබෙනවාද බලන්න:

```text
IP:45.112.204.246:8090
```

## සැලකිලිමත් වන්න

- Node server එක සහ ngrok tunnel එක දෙකම ක්‍රියාත්මකව තිබිය යුතුයි.
- Tracker එකට mobile data සහ signal තිබිය යුතුයි.
- H02 traffic සාමාන්‍යයෙන් application-level encryption නැති raw TCP data බැවින් device ID/location console logs හෝ public posts වල share නොකරන්න.
- පළමු test එක අවසන් වන තුරු default server command එක සුරක්ෂිතව තබාගන්න.
