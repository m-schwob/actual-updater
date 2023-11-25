"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const israeli_bank_scrapers_1 = require("israeli-bank-scrapers");
(function () {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // read documentation below for available options
            const calOptions = {
                companyId: israeli_bank_scrapers_1.CompanyTypes.visaCal,
                startDate: new Date('2020-01-01'),
                combineInstallments: false,
                showBrowser: true
            };
            // read documentation below for information about credentials
            const credentials = {
                username: '',
                password: ''
            };
            const scraper = (0, israeli_bank_scrapers_1.createScraper)(calOptions);
            const scrapeResult = yield scraper.scrape(credentials);
            if (scrapeResult.success) {
                scrapeResult.accounts.forEach((account) => {
                    account.txns.forEach((transaction)=>
                        {
                            importTransactions(accountId, [{
                                account_id: "e2564e8c-ec96-43d7-92ce-3b91ee9d2d69",
                                date: transaction.date,
                                amount: transaction.chargedAmount,
                                payee: transaction.description,
                                category_id: "c179c3f4-28a6-4fbd-a54d-195cced07a80"
                              }])
                        }
                    )
                });
            }
            else {
                throw new Error(scrapeResult.errorType);
            }
        }
        catch (e) {
            console.error(`scraping failed for the following reason: ${e.message}`);
        }
    });
})();
