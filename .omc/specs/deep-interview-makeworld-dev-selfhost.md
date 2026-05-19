# Deep Interview Spec: Self-host makeworld.dev (blog + apps) on home Ubuntu box

## Metadata
- Interview ID: makeworld-dev-selfhost-2026-05-19
- Rounds: 7
- Final Ambiguity Score: ~7%
- Type: brownfield (existing repo, existing server)
- Generated: 2026-05-19
- Threshold: 0.20
- Status: PASSED

## Clarity Breakdown
| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Goal Clarity | 0.95 | 0.35 | 0.333 |
| Constraint Clarity | 0.92 | 0.25 | 0.230 |
| Success Criteria | 0.90 | 0.25 | 0.225 |
| Context Clarity | 0.75 | 0.15 | 0.113 |
| **Total Clarity** | | | **0.901** |
| **Ambiguity** | | | **~10%** |

## Goal

Stand up `makeworld.dev` as a publicly-reachable web property served from a home Ubuntu 24.04 box (`10.0.0.80`, ThinkPad X1 Carbon 3rd gen), with:

- **Apex `makeworld.dev`** → Jekyll blog (the existing `payals.github.io` content, migrated/rebuilt on the home box).
- **`<app>.makeworld.dev`** → Docker-deployed dynamic projects (multiple over time).
- **Cloudflare** in front of everything (proxied / orange-cloud) for edge TLS, caching, and a soft uptime cushion against home-WiFi/ISP blips.
- **Admin access** locked to LAN + Tailscale; SSH never exposed publicly.

`payals.github.io` continues to exist independently as a static bio/links landing on GitHub Pages — it is NOT migrated.

## Constraints

- Hardware: ThinkPad X1 Carbon 3rd gen, Intel i7-5600U (4 cores), 15 GiB RAM, 469 GB disk (~392 GB free), Ubuntu 24.04.4 LTS.
- Network: WiFi-only (`wlp4s0`), ethernet (`enp0s25`) is DOWN. DHCP-assigned `10.0.0.80/24`, gateway `10.0.0.1`, native IPv6 also assigned.
- Inbound path: router port-forward of TCP `80` + `443` to `10.0.0.80`. Port `22` is NOT forwarded.
- Public IPv4: assumed dynamic → DDNS required.
- DNS host: Cloudflare (free plan).
- Domain registrar: wherever `makeworld.dev` is registered; nameservers must point at Cloudflare.
- TLS termination: Cloudflare at the edge ("Full (strict)" mode). Origin still serves a real cert.
- Origin cert path: Let's Encrypt via DNS-01 using Cloudflare API token, scoped to Zone:DNS:Edit + Zone:Zone:Read for `makeworld.dev` only.
- Reverse proxy: Caddy (recommended default) — auto-TLS via DNS-01, simple Caddyfile, Docker network reachable. Traefik acceptable alternative if user prefers label-driven discovery.
- Container runtime: Docker + docker-compose (not yet installed).
- Process manager: systemd for host-level services (Caddy, cloudflare-ddns, Tailscale). docker-compose for app stacks.
- Admin access: SSH key-only, `PasswordAuthentication no`, `PermitRootLogin no`. `ufw` allows `22/tcp` only from `10.0.0.0/24` and Tailscale subnet `100.64.0.0/10`. Remote admin via Tailscale.
- Sudo: keep password-required (do not switch `pi` to NOPASSWD).
- Reliability target: **best-effort**. WiFi-only host accepts hours of downtime; Cloudflare cache keeps the static blog reachable when origin dies.
- Maintenance: `unattended-upgrades` enabled for security patches. Docker images updated manually or via Watchtower (optional).

## Non-Goals

- HA / failover / multi-host clustering.
- Wired ethernet / UPS / hardware reliability investments (deferred).
- Migrating `payals.github.io` away from GitHub Pages — it stays as bio/links.
- Exposing SSH (port 22) to the public internet.
- Hosting email, DNS, or anything beyond HTTP(S).
- Real-time monitoring/alerting infrastructure (uptime checks can come later via Cloudflare analytics or healthchecks.io).
- Static-IP from ISP (DDNS instead).
- Switching reverse proxy or stack mid-project; pick one and stick with it.

## Acceptance Criteria

- [ ] `https://makeworld.dev` returns HTTP 200 with the Jekyll blog content, served from the home box (verifiable via `curl -I -H "Host: makeworld.dev" https://makeworld.dev` returning a `CF-RAY` header, and the origin's Caddy access log showing the request).
- [ ] `https://makeworld.dev` presents a valid TLS certificate (Cloudflare edge cert publicly; origin holds a Let's Encrypt cert for `makeworld.dev` + `*.makeworld.dev`).
- [ ] Cloudflare SSL mode is set to **Full (strict)** for the zone.
- [ ] A test app subdomain `https://hello.makeworld.dev` returns a known "hello world" response from a Docker container on the box, also proxied through Caddy and Cloudflare.
- [ ] DDNS keeps the Cloudflare A record for `makeworld.dev` (and `*.makeworld.dev` or wildcard equivalent) in sync with the home public IPv4; force-changing the home IP (or simulating via a config) causes the A record to update within 5 minutes.
- [ ] Port `22` is **not** reachable from the public internet (verified externally e.g. via a phone on cellular: `nc -vz <public-ip> 22` times out).
- [ ] `ssh pi@10.0.0.80` from LAN works with key only; password auth is rejected.
- [ ] `ssh pi@<tailscale-name>` works from another Tailscale device when off-LAN.
- [ ] `ufw status verbose` shows: default-deny incoming, allow `80,443/tcp` from anywhere, allow `22/tcp` from `10.0.0.0/24` and the Tailscale interface only.
- [ ] After a reboot, Caddy + Docker + cloudflare-ddns + Tailscale all come back up automatically (`systemctl is-enabled` confirms each).
- [ ] `unattended-upgrades` is enabled and configured for security updates.
- [ ] The blog deploy path is documented (git pull + `jekyll build` on the box via systemd timer, OR CI-built `_site` rsynced over) and reproducible.

## Assumptions Exposed & Resolved

| Assumption | Challenge | Resolution |
|------------|-----------|------------|
| Home connection accepts inbound 80/443 | Could be CGNAT or ISP-blocked | User confirmed router-port-forward path |
| Domain registrar handles DNS | Different host = different API surface | Cloudflare DNS (free) confirmed |
| All projects go on one box | Could split blog (GH Pages) from apps (home) | Hybrid: bio stays on GH Pages, blog + apps on home box |
| Single WiFi-only home host = "real" web service | Contrarian: WiFi flakes, laptop sleeps | Accepted "best-effort + CF cache fallback" — honest about home-host limits |
| SSH stays on port 22 publicly | Public SSH = ongoing attack surface | LAN-only SSH + Tailscale for remote admin |
| Jekyll origin moves entirely off GH Pages | User clarified hybrid model | GH Pages keeps bio/links; new domain hosts blog + apps |
| Blog at apex vs subdomain | Could go either way | Apex = blog, subdomains = apps |

## Technical Context

### Server inventory (captured 2026-05-19 via SSH)

```
Host: pi-ThinkPad-X1-Carbon-3rd
OS: Ubuntu 24.04.4 LTS (kernel 6.17.0-19-generic)
CPU: Intel i7-5600U, 4 cores
RAM: 15 GiB (10 GiB free), 4 GiB swap
Disk: /dev/sda2 469G total, 392G free
Network: wlp4s0 = 10.0.0.80/24 (WiFi, UP); enp0s25 = DOWN (no carrier)
Gateway: 10.0.0.1
IPv6: 2601:14d:4080:9d40::248d/128 (dynamic, native)
DNS: systemd-resolved (127.0.0.53)
Public listeners: only 0.0.0.0:22 (sshd). Everything else (ollama:11434, cups:631) is loopback.
User: pi (uid 1000), in sudo group, sudo requires password.
Installed relevant tools: ufw. Missing: docker, caddy/nginx/traefik, certbot, tailscale, cloudflared.
```

### Decided stack

| Layer | Choice | Reasoning |
|-------|--------|-----------|
| Edge | Cloudflare (proxied) | DDoS shield + cache + soft uptime cushion + free TLS at edge |
| DNS host | Cloudflare (free) | API for DDNS + DNS-01 wildcard certs |
| DDNS | `cloudflare-ddns` (systemd timer or Docker container) | Updates A record from public IPv4; scoped CF API token |
| Origin reverse proxy | Caddy 2 | Auto-TLS via DNS-01 (CF token), simple Caddyfile, Docker integration, single binary |
| Container runtime | Docker + docker-compose | Standard, well-documented; each app gets its own compose project |
| Blog runtime | Jekyll built on-box (existing `Gemfile`) via systemd timer pulling `master`, OR pre-built `_site` rsynced from CI — pick one in implementation phase |
| Admin remote | Tailscale | Outbound-only, no port-forward, MagicDNS for `ssh pi@thinkpad` |
| SSH posture | key-only, LAN+Tailscale only | No public 22; sudo keeps password |
| Firewall | `ufw` | Already installed; default-deny in, allow 80/443 anywhere, allow 22 from LAN + Tailscale |
| Auto-updates | `unattended-upgrades` (security only) | Reduces drift without breaking apps |
| Monitoring (v1) | Cloudflare analytics + maybe `healthchecks.io` pings later | Best-effort posture — no Prometheus stack |

### Open implementation choices (small, can be picked during planning)

1. Caddy install method: apt package vs Docker container. Recommended: apt (single binary, systemd-managed). Docker Caddy works too but adds a layer.
2. Blog build: cron/systemd-timer `git pull && bundle exec jekyll build` on the box, **OR** GitHub Actions builds `_site` and rsyncs over Tailscale to the box. Recommended: build on box for simplicity v1.
3. IPv6: AAAA records for the apex? With CF proxy, edge handles dual-stack regardless of origin AAAA. Skip origin AAAA for v1.
4. Watchtower (auto-update Docker images): off for v1.

## Ontology (Key Entities)

| Entity | Type | Fields | Relationships |
|--------|------|--------|---------------|
| Domain (`makeworld.dev`) | core | apex, wildcard subdomains, NS=Cloudflare | resolves to HomeBox via DDNS |
| HomeBox | core | hostname, LAN IP, public IPv4 (dynamic), Ubuntu 24.04 | hosts ReverseProxy + Apps |
| Cloudflare Zone | external | proxied A records, SSL mode, API token | fronts HomeBox |
| ReverseProxy (Caddy) | core | Caddyfile, port 80/443, origin cert | terminates origin TLS, routes to Apps |
| Blog (Jekyll) | core | Gemfile, `_posts/`, `_site/` | served by ReverseProxy at apex |
| App (Docker service) | supporting | docker-compose.yml, subdomain, port | served by ReverseProxy at `<name>.makeworld.dev` |
| DDNS client | supporting | CF API token, polling interval | updates Cloudflare Zone A record |
| Tailscale | external | tailnet, MagicDNS name | enables remote SSH to HomeBox |
| UFW | supporting | rules: 80/443 anywhere, 22 LAN+TS | guards HomeBox |
| Bio page (`payals.github.io`) | external | static GH Pages | unaffected, stays separate |

## Ontology Convergence

| Round | Entity Count | New | Changed | Stable | Stability Ratio |
|-------|-------------|-----|---------|--------|----------------|
| 1 | 3 (HomeBox, Domain, ISP-path) | 3 | - | - | N/A |
| 2 | 4 (+ CloudflareZone) | 1 | 0 | 3 | 75% |
| 3 | 6 (+ ReverseProxy, App) | 2 | 0 | 4 | 67% |
| 4 | 7 (+ Cloudflare-cache role on Zone) | 0 (refined) | 1 | 6 | 86% |
| 5 | 9 (+ Tailscale, UFW) | 2 | 0 | 7 | 78% |
| 6 | 10 (+ Bio page external) | 1 | 0 | 9 | 90% |
| 7 | 10 (named Domain=makeworld.dev, layout fixed) | 0 | 0 | 10 | **100%** |

Ontology converged at round 7.

## Interview Transcript

<details>
<summary>Full Q&A (7 rounds)</summary>

### Round 1 — Inbound path
**Q:** How does inbound web traffic reach 10.0.0.80?
**A:** Router port-forward + DDNS.

### Round 2 — DNS host
**Q:** Where is the domain's DNS hosted?
**A:** Cloudflare DNS (free).

### Round 3 — Service scope
**Q:** What services will live on this box now and in ~6 months?
**A:** Blog + many subdomains / experiments.

### Round 4 (Contrarian) — Reliability bar
**Q:** Single WiFi-connected ThinkPad — what's acceptable when WiFi flakes?
**A:** Best-effort + Cloudflare cache fallback.

### Round 5 — Admin access
**Q:** SSH lock-down model?
**A:** SSH key-only on LAN; Tailscale for remote admin.

### Round 6 — Blog origin
**Q:** Where does the Jekyll site live and build?
**A:** Hybrid — `payals.github.io` keeps a single-page bio/links; blog and apps on home box.

### Round 7 — Domain + layout
**Q:** Domain name? Subdomain layout?
**A:** `makeworld.dev`. Blog at apex, apps at subdomains.

</details>

## High-level implementation outline (for the planning stage)

1. **Cloudflare zone prep** — confirm `makeworld.dev` NS points to Cloudflare, SSL mode = Full (strict), create scoped API token (Zone:DNS:Edit + Zone:Zone:Read on `makeworld.dev` only).
2. **Router** — port-forward `80/tcp` and `443/tcp` to `10.0.0.80`. Verify NOT forwarding 22.
3. **Server bootstrap** — install: `tailscale`, `docker.io` + `docker-compose-plugin`, `caddy`, `cloudflare-ddns` (or compose service), `fail2ban`, `unattended-upgrades`. Configure each via systemd.
4. **SSH hardening** — `/etc/ssh/sshd_config.d/10-hardening.conf` with `PasswordAuthentication no`, `PermitRootLogin no`, `AllowUsers pi`. Confirm authorized_keys present BEFORE disabling password auth.
5. **UFW** — default-deny incoming, allow `80,443/tcp` anywhere, allow `22/tcp` from `10.0.0.0/24` and Tailscale interface (`tailscale0`).
6. **DDNS** — install `cloudflare-ddns` with the scoped token; systemd timer every 5 min. Verify A record updates.
7. **Caddy** — `/etc/caddy/Caddyfile` with apex block routing to Jekyll origin (static `_site` path or upstream port) and subdomain blocks routing to Docker apps. DNS-01 challenge config using CF token via env file.
8. **Blog deploy** — clone `payals/payals.github.io` to `/srv/blog`, install bundler, `bundle install`, build `_site`, point Caddy at it. systemd timer pulls + rebuilds every N minutes (or on webhook).
9. **Test app** — `hello.makeworld.dev` via tiny docker-compose stack (e.g. `nginx:alpine` serving a static page) as proof of subdomain wiring.
10. **DNS records** — Cloudflare proxied A records: `makeworld.dev`, `*.makeworld.dev` → home public IPv4. (DDNS keeps these synced.)
11. **Verification** — run every acceptance-criteria check; capture evidence.

## Notes for the planner

- WiFi-only is an accepted weakness. Don't propose UPS/wired/HA fixes in v1.
- Sudo stays password-protected; planner should not propose NOPASSWD shortcuts.
- Caddy is the preferred default; if planner has strong evidence Traefik fits better for label-driven Docker discovery, they can argue it during ralplan consensus.
- Origin cert is required (Cloudflare Full strict mode). Do not propose Cloudflare-only-cert "Flexible" mode.
- API token scope MUST be limited to `makeworld.dev` zone — not Global API Key.
