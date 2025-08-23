# remote-_-adder
A fork of [Remote Torrent Adder](https://github.com/bogenpirat/remote-torrent-adder)

Chrome started blocking [Remote Torrent Adder](https://github.com/bogenpirat/remote-torrent-adder) because it's using too wide permissions in the manifest

This extension hardcodes site permissions for now directly in manifest to keep chrome happy:
* The torrent sites it supports
* The qbitorrent http address
