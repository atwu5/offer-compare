import { OfferResult } from '../types'
import { fmtCNY, fmtPctPlain, rateLabel, round2 } from '../utils/money'
import { Card, Delta } from './ui'

type YearView = 'first' | 'steady'

export function WalletCards({
  a,
  b,
  yearView,
}: {
  a: OfferResult
  b: OfferResult
  yearView: YearView
}) {
  const ya = yearView === 'first' ? a.firstYear : a.steadyYear
  const yb = yearView === 'first' ? b.firstYear : b.steadyYear
  const yearLabel = yearView === 'first' ? '首年' : '稳定年'
  const cashDiff = round2(yb.disposableCash - ya.disposableCash)
  const hfDiff = round2(yb.housingFundAssetIncrease - ya.housingFundAssetIncrease)

  // 长期保障结论（稳定年口径）
  let pensionVerdict = '两份 Offer 缴费基础相同'
  if (b.effectivePensionBase > a.effectivePensionBase) pensionVerdict = `${b.offerName} 缴费基础更高`
  else if (b.effectivePensionBase < a.effectivePensionBase) pensionVerdict = `${a.offerName} 缴费基础更高`

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* 钱包一：可支配现金 */}
      <Card className="flex flex-col p-5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-base font-semibold text-slate-900">💰 可支配现金</h3>
          <span className="text-[11px] text-slate-400">{yearLabel}口径</span>
        </div>
        <p className="mt-1 text-xs text-slate-400">属于你、现在就能自由花的钱</p>
        <div className="mt-4 space-y-3">
          <WalletRow
            name={a.offerName}
            amount={ya.disposableCash}
            sub={`月均 ${fmtCNY(ya.disposableCash / 12)}`}
          />
          <WalletRow
            name={b.offerName}
            amount={yb.disposableCash}
            sub={`月均 ${fmtCNY(yb.disposableCash / 12)}`}
            emphasize
          />
        </div>
        <div className="mt-4 border-t border-dashed border-slate-200 pt-3 text-sm">
          <span className="text-slate-500">{yearLabel}差额：</span>
          <Delta value={cashDiff} />
        </div>
      </Card>

      {/* 钱包二：公积金 */}
      <Card className="flex flex-col p-5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-base font-semibold text-slate-900">🏠 公积金账户增加</h3>
          <span className="text-[11px] text-slate-400">{yearLabel}口径</span>
        </div>
        <p className="mt-1 text-xs text-slate-400">属于你，但不能随时花的钱（个人 + 单位）</p>
        <div className="mt-4 space-y-3">
          <div>
            <div className="mb-0.5 flex items-center justify-between text-[13px]">
              <span className="text-slate-500">{a.offerName}</span>
              <span className="num font-semibold text-slate-800">{fmtCNY(ya.housingFundAssetIncrease)} / 年</span>
            </div>
            <div className="text-[11px] text-slate-400">
              个人 {fmtCNY(ya.employeeHousingFund)} · 单位 {fmtCNY(ya.employerHousingFund)}
            </div>
          </div>
          <div>
            <div className="mb-0.5 flex items-center justify-between text-[13px]">
              <span className="font-medium text-slate-700">{b.offerName}</span>
              <span className="num font-semibold text-slate-900">{fmtCNY(yb.housingFundAssetIncrease)} / 年</span>
            </div>
            <div className="text-[11px] text-slate-400">
              个人 {fmtCNY(yb.employeeHousingFund)} · 单位 {fmtCNY(yb.employerHousingFund)}
            </div>
          </div>
        </div>
        <div className="mt-4 border-t border-dashed border-slate-200 pt-3 text-sm">
          <span className="text-slate-500">{yearLabel}差额：</span>
          <Delta value={hfDiff} />
          <p className="mt-1 text-[11px] leading-4 text-slate-400">
            个人缴纳虽减少当期现金，但会以「个人 + 单位」双倍进入你的公积金账户，不是损失。
          </p>
        </div>
      </Card>

      {/* 钱包三：长期保障 */}
      <Card className="flex flex-col p-5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-base font-semibold text-slate-900">🛡 长期保障</h3>
          <span className="text-[11px] text-slate-400">稳定年口径</span>
        </div>
        <p className="mt-1 text-xs text-slate-400">社保缴费基础决定未来的保障水平</p>
        <div className="mt-4 space-y-2 text-[13px]">
          <PolicyRow label="养老缴费基数" av={fmtCNY(a.effectivePensionBase)} bv={fmtCNY(b.effectivePensionBase)} />
          <PolicyRow
            label="养老个人缴费 / 年"
            av={fmtCNY(a.steadyYear.employeeSocialInsurance > 0 ? a.breakdown.find((x) => x.key === 'pension')?.amount ?? 0 : 0)}
            bv={fmtCNY(b.steadyYear.employeeSocialInsurance > 0 ? b.breakdown.find((x) => x.key === 'pension')?.amount ?? 0 : 0)}
          />
          <PolicyRow
            label="养老单位缴费 / 年"
            av={fmtCNY(a.employerPensionAnnual)}
            bv={fmtCNY(b.employerPensionAnnual)}
          />
          <PolicyRow
            label="公积金月缴存基数"
            av={`${fmtCNY(a.effectiveHousingFundBase)} × ${rateLabel(
              (a.steadyYear.employeeHousingFund + a.steadyYear.employerHousingFund) /
                Math.max(1, a.effectiveHousingFundBase * 12),
            )}`}
            bv={`${fmtCNY(b.effectiveHousingFundBase)} × ${rateLabel(
              (b.steadyYear.employeeHousingFund + b.steadyYear.employerHousingFund) /
                Math.max(1, b.effectiveHousingFundBase * 12),
            )}`}
          />
        </div>
        <div className="mt-4 border-t border-dashed border-slate-200 pt-3 text-sm">
          <span className="text-slate-500">结论：</span>
          <span className="font-medium text-slate-800">{pensionVerdict}</span>
          <p className="mt-1 text-[11px] leading-4 text-slate-400">
            单位养老缴费属于长期社会保障投入，不计入个人收入，也不折算成「保障价值」金额。
          </p>
        </div>
      </Card>
    </div>
  )
}

function WalletRow({
  name,
  amount,
  sub,
  emphasize = false,
}: {
  name: string
  amount: number
  sub: string
  emphasize?: boolean
}) {
  return (
    <div>
      <div className="mb-0.5 flex items-center justify-between">
        <span className={`text-[13px] ${emphasize ? 'font-medium text-slate-700' : 'text-slate-500'}`}>{name}</span>
        <span className={`num text-xl font-bold ${emphasize ? 'text-slate-900' : 'text-slate-700'}`}>
          {fmtCNY(amount)}
          <span className="ml-0.5 text-xs font-normal text-slate-400">/ 年</span>
        </span>
      </div>
      <div className="text-[11px] text-slate-400">{sub}</div>
    </div>
  )
}

function PolicyRow({ label, av, bv }: { label: string; av: string; bv: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="shrink-0 text-slate-500">{label}</span>
      <span className="num text-right text-[12px] text-slate-700">
        <span className="text-slate-400">A </span>
        {av}
        <span className="mx-1 text-slate-300">·</span>
        <span className="text-slate-400">B </span>
        <span className="font-medium">{bv}</span>
      </span>
    </div>
  )
}

// 避免 fmtPctPlain 未使用告警（保留给未来扩展）
void fmtPctPlain
