"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDefaultOffers = createDefaultOffers;
exports.cloneOffers = cloneOffers;
exports.newSubsidyId = newSubsidyId;
/** 默认 Demo：广州 20k×12 + 2 个月奖金 vs 深圳 25k×12 + 2 个月奖金 */
function createDefaultOffers() {
    return [
        {
            id: 'a',
            name: '当前工作',
            companyName: '',
            cityCode: 'guangzhou',
            cityCustomName: '',
            monthlySalary: 20000,
            fixedSalaryMonths: 12,
            fixedBonus: { mode: 'months', value: 2 },
            hasVariableBonus: false,
            variableBonus: {
                conservative: { mode: 'months', value: null },
                expected: { mode: 'months', value: null },
                optimistic: { mode: 'months', value: null },
            },
            probation: { months: 0, salaryRatio: 1 },
            subsidies: [],
            socialInsurance: {
                useCityDefault: true,
                pensionBase: null,
                medicalBase: null,
                unemploymentBase: null,
            },
            housingFund: { base: null, employeeRate: null, employerRate: null },
            monthlySpecialTaxDeduction: 0,
            livingCosts: { housing: null, commute: null, food: null, travel: null, other: null },
        },
        {
            id: 'b',
            name: '新 Offer',
            companyName: '',
            cityCode: 'shenzhen',
            cityCustomName: '',
            monthlySalary: 25000,
            fixedSalaryMonths: 12,
            fixedBonus: { mode: 'months', value: 2 },
            hasVariableBonus: false,
            variableBonus: {
                conservative: { mode: 'months', value: null },
                expected: { mode: 'months', value: null },
                optimistic: { mode: 'months', value: null },
            },
            probation: { months: 0, salaryRatio: 1 },
            subsidies: [],
            socialInsurance: {
                useCityDefault: true,
                pensionBase: null,
                medicalBase: null,
                unemploymentBase: null,
            },
            housingFund: { base: null, employeeRate: null, employerRate: null },
            monthlySpecialTaxDeduction: 0,
            livingCosts: { housing: null, commute: null, food: null, travel: null, other: null },
        },
    ];
}
function cloneOffers(offers) {
    return JSON.parse(JSON.stringify(offers));
}
let subsidySeq = 0;
function newSubsidyId() {
    subsidySeq += 1;
    return `s_${Date.now()}_${subsidySeq}_${Math.floor(Math.random() * 1000)}`;
}
