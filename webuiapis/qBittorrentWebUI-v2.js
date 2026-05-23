RTA.clients.qBittorrentV2Adder = function (server, data, torrentname, label, dir) {
	console.log("[DEBUG] qBittorrentV2Adder called, server:", JSON.stringify(server));
	var rootUrl = (server.hostsecure ? "https" : "http") + "://" + server.host + ":" + server.port;
	console.log("[DEBUG] rootUrl:", rootUrl);

	// execute login request
	fetch(rootUrl + "/api/v2/auth/login", {
		method: 'POST',
		headers: {
			"Content-Type": "application/x-www-form-urlencoded; charset=utf-8"
		},
		body: "username=" + encodeURIComponent(server.login) + "&password=" + encodeURIComponent(server.password)
	})
		.then(response => {
			console.log("[DEBUG] Login response status:", response.status);
			if (!response.ok) {
				throw Error("Login failed with status " + response.status);
			}
			return response;
		})
		.then(response => {
			if (response.status == 200 || response.status == 204) {
				return response.text();
			} else {
				throw new Error("Authentication failed with status " + response.status);
			}
		})
		.then(text => {
			if (text != "Ok." && text != "") {
				RTA.displayResponse("Failure", "Login to " + server.name + "'s WebUI failed.", true);
			} else {
				// prepre post body
				var message = new FormData();

				if (data.substring(0, 7) == "magnet:") {
					message.append("urls", data)
				} else {
					const dataBlob = RTA.convertToBlob(data, "application/x-bittorrent");
					const myName = ((torrentname.length && torrentname.length > 1) ? torrentname : (new Date).getTime());
					message.append("fileselect[]", dataBlob, myName);
				}

				if (dir) {
					message.append("savepath", dir);
				}

				if (label) {
					message.append("category", label);
				}

				// add the torrent
				fetch(rootUrl + "/api/v2/torrents/add", {
					method: 'POST',
					body: message
				})
					.then(RTA.handleFetchError)
					.then(response => response.text())
					.then(addText => {
						console.log("[DEBUG] Add torrent response:", addText);
						// qBittorrent 5.x returns JSON on success, older versions return "Ok."
						if (addText != "Ok." && addText != "") {
							// Check if response is valid JSON (success case in newer qBittorrent)
							try {
								var json = JSON.parse(addText);
								if (json.success_count > 0 || json.added_torrent_ids || json.ok) {
									RTA.displayResponse("Success", "Torrent added successfully to " + server.name + ".");
								} else {
									RTA.displayResponse("Failure", "Adding the torrent failed:\n" + addText, true);
								}
							} catch (e) {
								RTA.displayResponse("Failure", "Adding the torrent failed:\n" + addText, true);
							}
						} else {
							RTA.displayResponse("Success", "Torrent added successfully to " + server.name + ".");
						}
					})
					.catch(error => {
						RTA.displayResponse("Failure", "Could not contact " + server.name + "\nError: " + error.message, true);
					});
			}
		})
		.catch(error => {
			RTA.displayResponse("Failure", "Could not contact " + server.name + "\nError: " + error.message, true);
		});
};