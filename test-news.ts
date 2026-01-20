import yahooFinance from 'yahoo-finance2';

async function testNews() {
    try {
        const result = await yahooFinance.search('BBRI.JK', { newsCount: 5 });
        console.log("Search Result News:", JSON.stringify(result.news, null, 2));

        // Also try quoteSummary which sometimes has news
        // const quote = await yahooFinance.quoteSummary('BBRI.JK', { modules: ['summaryProfile', 'financialData'] }); 
        // News is usually separate or part of search/option
    } catch (e) {
        console.error(e);
    }
}

testNews();
