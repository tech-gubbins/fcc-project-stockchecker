'use strict';

const https = require('https');

// In-memory storage for likes and IP tracking (in production, use a database)
const stockLikes = new Map(); // Map<string, number> - stock symbol to like count
const ipLikes = new Map(); // Map<string, Set<string>> - anonymized IP to set of liked stocks

module.exports = function (app) {

  app.route('/api/stock-prices')
    .get(function (req, res) {
      const stock = req.query.stock;
      const like = req.query.like;
      
      // Validate that stock parameter is provided
      if (!stock) {
        return res.json({ error: 'Stock symbol is required' });
      }
      
      // Handle multiple stocks (array) or single stock
      const stocks = Array.isArray(stock) ? stock : [stock];
      
      // Limit to maximum 2 stocks as per requirements
      if (stocks.length > 2) {
        return res.json({ error: 'Maximum 2 stocks allowed' });
      }
      
      // Function to get stock data from external API
      const getStockData = (symbol) => {
        return new Promise((resolve, reject) => {
          // Using a free stock API (you may need to replace with actual API)
          const url = `https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${symbol}/quote`;
          
          https.get(url, (response) => {
            let data = '';
            
            response.on('data', (chunk) => {
              data += chunk;
            });
            
            response.on('end', () => {
              try {
                const parsed = JSON.parse(data);
                resolve({
                  stock: parsed.symbol || symbol.toUpperCase(),
                  price: parsed.latestPrice || 0
                });
              } catch (error) {
                reject(error);
              }
            });
          }).on('error', (error) => {
            reject(error);
          });
        });
      };
      
      // Function to get base likes count
      const getLikes = (symbol) => {
        return stockLikes.get(symbol) || 0;
      };

      // Function to handle likes with anonymized IP tracking
      const handleLike = (symbol, shouldLike, req) => {
        if (!shouldLike) {
          return getLikes(symbol);
        }
        
        const anonymizedIP = getAnonymizedIP(req);
        
        // Check if this anonymized IP has already liked this stock
        const userLikedStocks = ipLikes.get(anonymizedIP) || new Set();
        const hasAlreadyLiked = userLikedStocks.has(symbol);
        
        if (!hasAlreadyLiked) {
          // Increment like count
          const currentLikes = getLikes(symbol);
          const newLikes = currentLikes + 1;
          stockLikes.set(symbol, newLikes);
          
          // Record that this IP has liked this stock
          userLikedStocks.add(symbol);
          ipLikes.set(anonymizedIP, userLikedStocks);
          
          return newLikes;
        }
        
        // IP already liked this stock, return current count without incrementing
        return getLikes(symbol);
      };
      
      // Function to anonymize client IP by truncating the last octet
      const getAnonymizedIP = (req) => {
        const fullIP = req.ip || req.connection.remoteAddress || '0.0.0.0';
        
        // Handle IPv4 addresses (e.g., 192.168.1.100 -> 192.168.1.0)
        if (fullIP.includes('.') && !fullIP.includes(':')) {
          const parts = fullIP.split('.');
          if (parts.length === 4) {
            return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
          }
        }
        
        // Handle IPv6 addresses (truncate last 64 bits)
        if (fullIP.includes(':')) {
          const parts = fullIP.split(':');
          if (parts.length >= 4) {
            return `${parts.slice(0, 4).join(':')}::`;
          }
        }
        
        // Fallback for unexpected formats
        return '0.0.0.0';
      };
      
      // Process stock requests
      Promise.all(stocks.map(symbol => getStockData(symbol.toUpperCase())))
        .then(stockData => {
          if (stocks.length === 1) {
            // Single stock response
            const stock = stockData[0];
            const likes = handleLike(stock.stock, like === 'true', req);
            
            res.json({
              stockData: {
                stock: stock.stock,
                price: stock.price,
                likes: likes
              }
            });
          } else {
            // Two stocks response - show relative likes
            const stock1 = stockData[0];
            const stock2 = stockData[1];
            
            const likes1 = handleLike(stock1.stock, like === 'true', req);
            const likes2 = handleLike(stock2.stock, like === 'true', req);
            
            // Calculate relative likes
            const rel_likes1 = likes1 - likes2;
            const rel_likes2 = likes2 - likes1;
            
            res.json({
              stockData: [
                {
                  stock: stock1.stock,
                  price: stock1.price,
                  rel_likes: rel_likes1
                },
                {
                  stock: stock2.stock,
                  price: stock2.price,
                  rel_likes: rel_likes2
                }
              ]
            });
          }
        })
        .catch(error => {
          console.error('Error fetching stock data:', error);
          res.json({ error: 'Unable to fetch stock data' });
        });
    });
};