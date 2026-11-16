# Landing: TP-Link router (model TBD)
Check the model and hardware version on the bottom label.
## A. If OpenWrt supports it (openwrt.org Table of Hardware)
Flash OpenWrt, then `opkg install python3 python3-pip` and `pip install rns`. Use landing-neo/config.template as rnsd config. The router becomes the always-on transport.
## B. Stock firmware (default)
1. DHCP reservation: give the Neo a fixed LAN IP (e.g. 192.168.0.50) under Advanced > Network > DHCP Server > Address Reservation.
2. Port forwarding: external TCP 4242 -> Neo IP, port 4242 (Advanced > NAT Forwarding > Virtual Servers).
3. Optional: TP-Link DDNS (Advanced > Network > Dynamic DNS) for a stable hostname.
4. Allow multicast/IPv6 link-local on the LAN (AutoInterface needs it). Turn off "AP isolation".
