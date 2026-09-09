import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Offer, OfferResult, ScenarioKey } from './types'
import { POLICY_DATA_NOTICE, getPolicy, latestPolicyUpdatedAt } from './data/cityPolicies'
import { cloneOffers, createDefaultOffers } from './data/defaults'
import { SCENARIO_LABELS, buildHeadline, computeOfferResult } from './utils/offerCalculator'
import { OfferForm } from './components/OfferForm'
import { ComparisonSummary } from './components/ComparisonSummary'
import { ScenarioTable } from './components/ScenarioTable'
import { WalletCards } from './components/WalletCards'
import { DifferenceBreakdown } from './components/DifferenceBreakdown'
import { CalculationDetails } from './components/CalculationDetails'
import { PolicyDrawer } from './components/PolicyDrawer'
import { SalaryReverseCalculator } from './components/SalaryReverseCalculator'
import { Alert, Badge, Card, SectionHeading, Segmented } from './components/ui'

type YearView = 'first' | 'steady'

export default function App() {
  const [offers, setOffers] = useState<Offer[]>(createDefaultOffers)
  const [scenario, setScenario] = useState<ScenarioKey>('expected')
  const [yearView, setYearView] = useState<YearView>('steady')
  const [drawerCity, setDrawerCity] = useState<string | null>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  const policyA = useMemo(() => getPolicy(offers[0]?.cityCode ?? ''), [offers])
  const policyB = useMemo(() => getPolicy(offers[1]?.cityCode ?? ''), [offers])

  // 三个场景 × 两个 Offer 的实时计算
  const resultSets = useMemo(() => {
    const scenarios: ScenarioKey[] = ['conservative', 'expected', 'optimistic']
    const out = {} as Record<ScenarioKey, [OfferResult, OfferResult]>
    for (const s of scenarios) {
      out[s] = [
        computeOfferResult(offers[0], policyA, s),
        computeOfferResult(offers[1], policyB, s),
      ]
    }
    return out
  }, [offers, policyA, policyB])

  const resA = resultSets[scenario][0]
  const resB = resultSets[scenario][1]
  const headline = useMemo(() => buildHeadline(resA, resB), [resA, resB])

  const updateOffer = (id: string, patch: Partial<Offer>) => {
    setOffers((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)))
  }
  const swapOffers = () => setOffers((prev) => [cloneOffers([prev[1]])[0], cloneOffers([prev[0]])[0]])
  const resetOffers = () => setOffers(createDefaultOffers())
  const scrollToResults = () =>
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const dataUpdatedAt = latestPolicyUpdatedAt([offers[0]?.cityCode ?? '', offers[1]?.cityCode ?? ''])

  return (
    <div className="min-h-screen">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <div className="flex items-baseline gap-2.5">
            <span className="text-[15px] font-bold text-slate-900">Offer 到手对比</span>
            <span className="hidden text-xs text-slate-400 sm:inline">
              别只看月薪，算清这个 Offer 到底涨了多少
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetOffers}
              className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            >
              重置
            </button>
            <button
              type="button"
              onClick={swapOffers}
              className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            >
              ⇄ 交换
            </button>
            <button
              type="button"
              onClick={scrollToResults}
              className="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-[13px] font-medium text-white shadow-sm transition hover:bg-indigo-700"
            >
              查看 Offer 对比结果
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-4 pb-16 sm:px-6">
        {/* 顶部产品介绍 */}
        <section className="px-2 pb-6 pt-10 sm:pt-14">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Offer 到手对比
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-500">
            别只看月薪，算清这个 Offer 到底涨了多少。比较不同城市、不同公司的 Offer：扣除个税、五险一金、
            生活成本，并考虑奖金、补贴与公积金之后，到底哪个更值得选。
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge tone="indigo">三个钱包看全收入</Badge>
            <Badge tone="indigo">每一分钱可溯源</Badge>
            <Badge tone="indigo">本地计算，数据不上传</Badge>
          </div>
          <div className="mt-5">
            <Alert tone="warn">{POLICY_DATA_NOTICE}</Alert>
          </div>
        </section>

        {/* Offer 输入 */}
        <section className="pb-10">
          <SectionHeading
            index="01"
            title="填写两个 Offer"
            desc="只填你确定知道的信息，五险一金由城市政策自动带出；所有结果随输入实时更新。"
            right={
              <button
                type="button"
                disabled
                title="架构已预留多 Offer 支持，当前版本暂只支持 A / B 对比"
                className="cursor-not-allowed rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-[13px] text-slate-400"
              >
                + 添加 Offer
              </button>
            }
          />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {offers.slice(0, 2).map((offer, i) => (
              <Card key={offer.id} className="self-start">
                <OfferForm
                  tag={i === 0 ? 'A' : 'B'}
                  accent={i === 0 ? 'blue' : 'violet'}
                  offer={offer}
                  policy={i === 0 ? policyA : policyB}
                  errors={(i === 0 ? resA : resB).errors}
                  onChange={(patch) => updateOffer(offer.id, patch)}
                  onOpenPolicy={setDrawerCity}
                />
              </Card>
            ))}
          </div>
          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={scrollToResults}
              className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              查看 Offer 对比结果 ↓
            </button>
          </div>
        </section>

        {/* 结果区 */}
        <div ref={resultsRef} className="scroll-mt-16 space-y-10">
          {/* 结果工具条 */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-slate-500">场景</span>
              <Segmented<ScenarioKey>
                size="sm"
                value={scenario}
                onChange={setScenario}
                options={[
                  { value: 'conservative', label: '保守' },
                  { value: 'expected', label: '正常' },
                  { value: 'optimistic', label: '乐观' },
                ]}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-slate-500">期间</span>
              <Segmented<YearView>
                size="sm"
                value={yearView}
                onChange={setYearView}
                options={[
                  { value: 'first', label: '首年' },
                  { value: 'steady', label: '稳定年' },
                ]}
              />
            </div>
            <span className="text-xs text-slate-400">以下结果随所选场景与期间实时更新</span>
          </div>

          {/* 02 核心对比结论 */}
          <section>
            <SectionHeading index="02" title="核心对比结论" />
            <ComparisonSummary a={resA} b={resB} headline={headline} />
          </section>

          {/* 03 场景对比 */}
          <section>
            <SectionHeading
              index="03"
              title="收入波动场景"
              desc="填写浮动奖金的保守 / 正常 / 乐观值后，自动对比三个场景。"
            />
            <ScenarioTable resultSets={resultSets} onPick={setScenario} activeScenario={scenario} />
          </section>

          {/* 04 三个钱包 */}
          <section>
            <SectionHeading
              index="04"
              title="三个钱包"
              desc="总收入没有意义，拆成「现在能花的钱 / 不能随时花的钱 / 长期保障」才看得清。"
            />
            <WalletCards a={resA} b={resB} yearView={yearView} />
          </section>

          {/* 05 差异来源 */}
          <section>
            <SectionHeading index="05" title="为什么差这么多" />
            <DifferenceBreakdown a={resA} b={resB} yearView={yearView} scenario={scenario} />
          </section>

          {/* 06 完整明细 */}
          <section>
            <SectionHeading index="06" title="完整收入明细与计算依据" />
            <CalculationDetails
              a={resA}
              b={resB}
              yearView={yearView}
              scenario={scenario}
              policyA={policyA}
              policyB={policyB}
              onOpenPolicy={setDrawerCity}
            />
          </section>

          {/* 07 谈薪反推 */}
          <section>
            <SectionHeading index="07" title="谈薪反推" />
            <SalaryReverseCalculator
              offerA={offers[0]}
              policyA={policyA}
              offerB={offers[1]}
              policyB={policyB}
              enabled={resA.valid && resB.valid}
              bName={resB.offerName}
              bSalary={offers[1]?.monthlySalary ?? 0}
            />
          </section>

          {/* 08 计算依据 */}
          <section>
            <SectionHeading index="08" title="计算依据与口径" />
            <Card className="space-y-3 p-5 sm:p-6">
              <Assumption title="个人所得税口径">
                采用全年综合所得「年度汇算」口径估算：应纳税所得额 = 全年税前现金收入 − 60,000
                元基本减除费用 − 五险一金个人缴纳 − 专项附加扣除 × 12，按年度税率表一次性计算。
                未采用「累计预扣法」逐月模拟，因此月度代扣可能与公司实际发放略有差异，但全年合计更接近汇算清缴结果。
                年终奖按并入综合所得计税（未使用全年一次性奖金单独计税优惠）。
              </Assumption>
              <Assumption title="五险一金基数">
                默认按「当月实际税前工资」作为缴费基数，并按城市政策上下限自动调整（调整会明确提示，不静默截断）；
                13～16 薪的额外发薪月份不重复计入缴费基数。手动填写基数时按填写值计算，超出范围同样按上下限调整。
              </Assumption>
              <Assumption title="公积金">
                个人与单位缴存均进入个人公积金账户，属于「受限个人资产」；个人缴存会减少当期可支配现金，
                但会以个人 + 单位双倍金额进入你的账户，不是损失。
              </Assumption>
              <Assumption title="单位社保缴费">
                仅作为「长期社会保障投入」展示，不计入个人收入或总收入，也不折算为「保障价值」金额。
              </Assumption>
              <Assumption title="试用期">
                假设入职第一年即开始试用期，试用期折扣仅影响首年工资与首年社保公积金基数。
              </Assumption>
              <Assumption title="补贴">
                标记为「可能获得」的补贴默认不计入核心结果，必须手动勾选「我确认自己符合条件」后才计入；
                一次性补贴（如签字费）只计入首年，稳定年口径会将其排除。
              </Assumption>
              <Assumption title="稳定年">
                指长期稳定工作状态下的代表性年份：不含签字费、一次性补贴与仅首年补贴；
                「指定年数」的补贴在其持续期内视同长期发放。
              </Assumption>
              <Assumption title="生活成本">
                仅计算你填写的工作相关变化项（房租 / 通勤 / 餐饮 / 异地往返 / 其他），
                不包含任何完整城市生活成本数据库。
              </Assumption>
            </Card>
          </section>

          {/* 09 政策参数与数据来源 */}
          <section>
            <SectionHeading index="09" title="政策参数与数据来源" />
            <Card className="p-5 sm:p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[offers[0], offers[1]].map((o, i) => {
                  const p = i === 0 ? policyA : policyB
                  return (
                    <div key={o?.id ?? i} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-800">
                          {p ? p.cityName : o?.cityCustomName || '其他城市'}
                        </span>
                        {p && <Badge tone={p.demo ? 'amber' : 'green'}>{p.demo ? '演示数据' : '已核验'}</Badge>}
                      </div>
                      {p ? (
                        <>
                          <div className="mt-2 space-y-1 text-[13px] text-slate-500">
                            <div>政策版本：{p.version}</div>
                            <div className="num">生效日期：{p.effectiveDate}</div>
                            <div className="num">数据更新：{p.updatedAt}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setDrawerCity(p.cityCode)}
                            className="mt-3 text-[13px] font-medium text-indigo-600 hover:underline"
                          >
                            查看完整参数 &gt;
                          </button>
                        </>
                      ) : (
                        <p className="mt-2 text-[13px] text-slate-400">
                          无内置政策数据，使用手动填写参数。
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="mt-4">
                <Alert tone="warn">{POLICY_DATA_NOTICE}</Alert>
              </div>
            </Card>
          </section>
        </div>
      </main>

      {/* 页脚 */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-[1180px] space-y-2 px-4 py-6 text-xs leading-relaxed text-slate-400 sm:px-6">
          <p>
            本工具用于帮助求职者进行 Offer 收入测算和比较，实际收入会受公司缴费方式、个人所得税申报、专项附加扣除、
            奖金发放方式及最新地方政策影响。结果仅供决策参考，请以公司 HR、税务及当地官方政策为准。
          </p>
          <p className="num">政策数据更新时间：{dataUpdatedAt || '—'}（当前为演示数据）</p>
          <p>所有计算均在浏览器本地完成，你的输入不会上传到任何服务器。</p>
        </div>
      </footer>

      <PolicyDrawer cityCode={drawerCity} onClose={() => setDrawerCity(null)} />
    </div>
  )
}

function Assumption({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
      <p className="mt-1 text-[13px] leading-relaxed text-slate-500">{children}</p>
    </div>
  )
}
