const fetch = global.fetch || require('node-fetch');

async function testEndpoint() {
    const url = 'http://localhost:3000/api/analyze/multi-timeframe';

    console.log('🧪 Testing MTF API Endpoint...');

    // Test 1: Valid Scalping Request
    try {
        console.log('\n[1] Testing Valid Scalping Request (BBRI)...');
        const start = Date.now();
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol: 'BBRI', mode: 'scalping' })
        });
        const data = await res.json();
        const duration = Date.now() - start;

        if (res.ok && data.timeframes && data.confluence) {
            console.log(`✅ Success (${duration}ms)`);
            console.log(`   Direction: ${data.confluence.direction}`);
            console.log(`   Strength: ${data.confluence.strength}%`);
        } else {
            console.error('❌ Failed:', data);
        }
    } catch (e) {
        console.error('❌ Error for Test 1:', e.message);
    }

    // Test 2: Input Validation (Missing Symbol)
    try {
        console.log('\n[2] Testing Missing Symbol...');
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'scalping' }) // No symbol
        });
        const data = await res.json();

        if (res.status === 400 && data.error) {
            console.log('✅ Success: Correctly rejected missing symbol');
        } else {
            console.error(`❌ Failed: Expected 400, got ${res.status}`);
        }
    } catch (e) {
        console.error('❌ Error for Test 2:', e.message);
    }

    // Test 3: Caching Check (Repeat Request)
    try {
        console.log('\n[3] Testing Caching (Repeat BBRI Request)...');
        const start = Date.now();
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol: 'BBRI', mode: 'scalping' })
        });
        const duration = Date.now() - start;

        if (res.ok && duration < 1000) { // Should be super fast
            console.log(`✅ Success: Cache HIT (${duration}ms)`);
        } else {
            console.log(`⚠️ Warning: Duration ${duration}ms (Might not be cached or first run was slow)`);
        }
    } catch (e) {
        console.error('❌ Error for Test 3:', e.message);
    }
}

testEndpoint();
