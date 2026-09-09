import { CityPolicy } from '../types'
import { getPolicy } from '../data/cityPolicies'
import { fmtCNY, rateLabel } from '../utils/money'
import { Badge } from './ui'

export function PolicyDrawer({
  cityCode,
  onClose,
}: {
  cityCode: string | null
  onClose: () => void
}) {
  if (!cityCode) return null
  const policy: CityPolicy | null = getPolicy(cityCode)

  return (
    <div className="fixed inset-0 z-50">
      <div className="fade-in absolute inset-0 bg-slate-900/30" onClick={onClose} />
      <aside className="drawer-in absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              {policy ? policy.cityName : '其他城市'}五险一金参数
            </h3>
            {policy && (
              <div className="mt-1 flex items-center gap-1.5">
                <Badge tone={policy.demo ? 'amber' : 'green'}>{policy.demo ? '演示数据 · 未核验' : '已核验'}</Badge>
                <span className="text-xs text-slate-400">{policy.version}</span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          {!policy ? (
            <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              该城市暂无内置政策数据。请在 Offer 的五险一金设置中选择「我知道具体缴费基数」，手动填写比例与基数。
            </p>
          ) : (
            <>
              {policy.demo && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[13px] leading-relaxed text-amber-800">
                  ⚠️ 以下为<b>演示数据</b>，仅用于功能测试，请勿作为真实缴费依据。
                </div>
              )}

              <InsuranceBlock title="养老保险" p={policy.pension} />
              <InsuranceBlock title="医疗保险" p={policy.medical} />
              <InsuranceBlock title="失业保险" p={policy.unemployment} />

              <div>
                <h4 className="mb-2 text-sm font-semibold text-slate-800">住房公积金</h4>
                <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm">
                  <Row
                    label="个人比例（默认）"
                    value={`${rateLabel(policy.housingFund.employeeRateDefault)}（允许 ${rateLabel(policy.housingFund.rateMin)}～${rateLabel(policy.housingFund.rateMax)}）`}
                  />
                  <Row
                    label="单位比例（默认）"
                    value={`${rateLabel(policy.housingFund.employerRateDefault)}（允许 ${rateLabel(policy.housingFund.rateMin)}～${rateLabel(policy.housingFund.rateMax)}）`}
                  />
                  <Row label="缴存基数下限" value={fmtCNY(policy.housingFund.baseMin)} />
                  <Row label="缴存基数上限" value={fmtCNY(policy.housingFund.baseMax)} />
                </dl>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">
                  个人与单位缴存均进入你的公积金账户；个人缴存部分免征个税。
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4 text-[13px] text-slate-600">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-xs text-slate-400">政策生效</div>
                    <div className="num">{policy.effectiveDate}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">数据更新</div>
                    <div className="num">{policy.updatedAt}</div>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-xs text-slate-400">政策来源</div>
                  {policy.sources.length > 0 ? (
                    policy.sources.map((s, i) => (
                      <div key={i}>
                        {s.url ? (
                          <a href={s.url} target="_blank" rel="noreferrer" className="font-medium text-indigo-600 hover:underline">
                            {s.name}（查看原文）&gt;
                          </a>
                        ) : (
                          <span className="text-amber-700">{s.name}</span>
                        )}
                      </div>
                    ))
                  ) : (
                    <span>—</span>
                  )}
                </div>
                {policy.notes && <p className="mt-2 text-xs leading-relaxed text-slate-400">{policy.notes}</p>}
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  )
}

function InsuranceBlock({ title, p }: { title: string; p: CityPolicy['pension'] }) {
  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold text-slate-800">{title}</h4>
      <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm">
        <Row label="个人比例" value={rateLabel(p.employeeRate)} />
        <Row label="单位比例" value={rateLabel(p.employerRate)} />
        <Row label="基数下限" value={fmtCNY(p.baseMin)} />
        <Row label="基数上限" value={fmtCNY(p.baseMax)} />
      </dl>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-3.5 py-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="num font-medium text-slate-800">{value}</dd>
    </div>
  )
}
