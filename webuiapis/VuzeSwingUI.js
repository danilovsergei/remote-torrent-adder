RTA.clients.vuzeSwingAdder = function (server, data) {
	// vuze swing ui can't handle magnet links/urls, only torrent files.
	if (data.substring(0, 7) == "magnet:") {
		RTA.displayResponse("Client Failure", "Sorry, the Vuze Swing UI does not support adding magnet links directly. Please try the 'Bigly/Vuze Remote WebUI' client type in the options.", true);
		return;
	}

	const url = "http" + (server.hostsecure ? "s" : "") + "://" + server.host + ":" + server.port + "/upload.cgi?type=torrent&stop=1";

	// The data is a binary string. Convert it to a blob.
	const torrentBlob = RTA.convertToBlob(data, 'application/x-bittorrent');

	const formData = new FormData();
	formData.append('torrent_file', torrentBlob, 'file.torrent');

	fetch(url, {
		method: 'POST',
		headers: {
			'Authorization': 'Basic ' + btoa(server.login + ":" + server.password)
		},
		body: formData
	})
		.then(RTA.handleFetchError)
		.then(response => {
			RTA.displayResponse("Success", "Torrent added successfully.");
		})
		.catch(error => {
			RTA.displayResponse("Failure", "Server didn't accept data:\n" + error.message, true);
		});
}
