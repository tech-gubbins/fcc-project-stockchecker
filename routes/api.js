"use strict";

const https = require("https");

module.exports = function (app) {
	app.route("/api/stock-prices").get(function (req, res) {
		const stock = req.query.stock;
		const like = req.query.like;

		// Validate that stock parameter is provided
		if (!stock) {
			return res.json({ error: "Stock symbol is required" });
		}

		// Handle multiple stocks (array) or single stock
		const stocks = Array.isArray(stock) ? stock : [stock];

		// Limit to maximum of two stocks per requirements
		if (stocks.length > 2) {
			return res.json({ error: "Maximum of two stocks allowed" });
		}

		// Function to get stock data from external API
		const getStockData = (symbol) => {
			return new Promise((resolve, reject) => {
				const url = `https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${symbol}/quote`;

				https.get(url, (response) => {
					let data = "";

					response.on("data", (chunk) => {
						data += chunk;
					});

					response
						.on("end", () => {
							try {
								const parsed = JSON.parse(data);
								resolve({
									stock:
										parsed.symbol || symbol.toUpperCase(),
									price: parsed.latestPrice || 0,
								});
							} catch (error) {
								reject(error);
							}
						})
						.on("error", (error) => {
							reject(error);
						});
				});
			});

			// Function to get base likes count
			const getLikes = (symbol) => {
				// In a real application, this would query a database or cache
				// For this examples, we'll just return a placeholder value

				return Math.floor(Math.random() * 100); // PLACEHOLDER VALUE
			};

			// Function to handle likes with anonymized IP tracking
			const handleLike = (symbol, shouldLike, req) => {
				if (!shouldLike) {
					return getLikes(symbol);
				}

				const anonymizedIP = getAnonymizedIP(req);

				// In a real database implementation, you would:
				// 1. Check if this anonymized IP has already liked this stock
				// 2. If not, increement the like count and record the anonymized IP
				// 3. Return the updated like count

				// For now, we'll simulate this with a simple increment
				// In production, replace this with actual datbase operations
				let currentLikes = getLikes(symbol);

				// Simulate checking if the IP has already liked (query the database)
				const hasAlreadyLiked = false; // PLACEHOLDER DATABASE QUERY RESULT

				if (!hasAlreadyLiked) {
					currentLikes += 1;
					// Here we would also record the anonymized IP in the database
				}

				return currentLikes;
			};

			const getAnonymizedIP = (req) => {
				const fullIP =
					req.ip || req.connection.remoteAddress || "0.0.0.0";

				// Handle IPv4 addresses
				if (fullIP.includes(".") && !fullIP.includes(":")) {
					const parts = fullIP.split(".");
					if (parts.length === 4) {
						return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`; // Anonymize last octet
					}
				}

				// Fallback for other formats (IPv6, etc.)
				return "0.0.0.0";
			};

			// Process stock requests
			Promise.all(
				stocks.map((symbol) => getStockData(symbol.toUpperCase()))
			)
				.then((stockData) => {
					if (stocks.length === 1) {
						// Single stock response
						const stock = stockData[0];
						const likes = handleLike(
							stock.stock,
							like === "true",
							req
						);

						res.json({
							stockData: {
								stock: stock.stock,
								price: stock.price,
								likes: likes,
							},
						});
					} else {
						// Two stocks response - show relative likes
						const stock1 = stockData[0];
						const stock2 = stockData[1];

						const likes1 = handleLike(
							stock1.stock,
							like === "true",
							req
						);
						const likes2 = handleLike(
							stock2.stock,
							like === "true",
							req
						);

						// Calculate relative likes
						const rel_likes1 = likes1 - likes2;
						const rel_likes2 = likes2 - likes1;

						res.json({
							stockData: [
								{
									stock: stock1.stock,
									price: stock1.price,
									rel_likes: rel_likes1,
								},
								{
									stock: stock2.stock,
									price: stock2.price,
									rel_likes: rel_likes2,
								},
							],
						});
					}
				})
				.catch((error) => {
					console.error("Error fetching stock data:", error);
					res.status(500).json({
						error: "Failed to fetch stock data",
					});
				});
		};
	});
};
