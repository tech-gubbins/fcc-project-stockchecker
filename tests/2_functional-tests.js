const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests: GET requests to /api/stock-prices', function() {
    test('Test with one stock', function(done) {
        chai.request(server)
            .get('/api/stock-prices')
            .query({ stock: 'AAPL' })
            .end(function(err, res) {
                assert.equal(res.status, 200);
                assert.isObject(res.body);
                assert.property(res.body, 'stockData');
                done();
            });
    });
    test('Test with one stock and liking it', function(done) {
        chai.request(server)
            .get('/api/stock-prices')
            .query({ stock: 'AAPL', like: true })
            .end(function(err, res) {
                assert.equal(res.status, 200);
                assert.isObject(res.body);
                assert.property(res.body, 'stockData');
                assert.isNumber(res.body.stockData.likes);
                done();
            });
    });
    test('Test with the same stock and liking it again', function(done) {
    // First, get the current like count
    chai.request(server)
        .get('/api/stock-prices')
        .query({ stock: 'AAPL', like: true })
        .end(function(err, res) {
            const firstLikeCount = res.body.stockData.likes;
            
            // Then try to like it again from the same IP
            chai.request(server)
                .get('/api/stock-prices')
                .query({ stock: 'AAPL', like: true })
                .end(function(err, res) {
                    assert.equal(res.status, 200);
                    assert.isObject(res.body);
                    assert.property(res.body, 'stockData');
                    assert.isNumber(res.body.stockData.likes);
                    assert.equal(res.body.stockData.likes, firstLikeCount); // Like count should not increase
                    done();
                });
        });
});
    test('Test with two stocks', function(done) {
        chai.request(server)
            .get('/api/stock-prices')
            .query({ stock: ['AAPL', 'GOOGL'] })
            .end(function(err, res) {
                assert.equal(res.status, 200);
                assert.isObject(res.body);
                assert.property(res.body, 'stockData');
                assert.isArray(res.body.stockData);
                assert.equal(res.body.stockData.length, 2);
                done();
            });
    });
    test('Test with two stocks and liking them', function(done) {
        chai.request(server)
            .get('/api/stock-prices')
            .query({ stock: ['AAPL', 'GOOGL'], like: true })
            .end(function(err, res) {
                assert.equal(res.status, 200);
                assert.isObject(res.body);
                assert.property(res.body, 'stockData');
                assert.isArray(res.body.stockData);
                assert.equal(res.body.stockData.length, 2);
                res.body.stockData.forEach(stock => {
                    assert.isNumber(stock.rel_likes);
                });
                done();
            });
    });
});
