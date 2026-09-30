import { CityPolicy, BonusMode, Offer, OfferHousingFund, OfferSocialInsurance, Subsidy } from '../types'
import { CITY_OPTIONS, getPolicy } from '../data/cityPolicies'
import { newSubsidyId } from '../data/defaults'
import { fmtCNY, rateLabel } from '../utils/money'
import { Alert, Badge, Checkbox, FieldLabel, NumberInput, Segmented, Select, TextInput } from './ui'
import { LIVING_COST_KEYS, LIVING_COST_LABELS } from '../utils/offerCalculator'

const ACCENTS = {
  blue: {
    chip: 'bg-steel-500/10 text-steel-300 border-steel-500/30',
    bar: 'bg-steel-400',
  },
  violet: {
    chip: 'bg-gold-500/10 text-gold-700 border-gold-500/30',
    bar: 'bg-gold-400',
  },
}

const SUBSIDY_PRESETS: Omit<Subsidy, 'id' | 'amount'>[] = [
  { name: '餐补', frequency: 'monthly', duration: 'permanent', durationYears: 1, certainty: 'confirmed', included: false },
  { name: '交通补贴', frequency: 'monthly', duration: 'permanent', durationYears: 1, certainty: 'confirmed', included: false },
  { name: '通讯补贴', frequency: 'monthly', duration: 'permanent', durationYears: 1, certainty: 'confirmed', included: false },
  { name: '租房补贴', frequency: 'monthly', duration: 'permanent', durationYears: 1, certainty: 'confirmed', included: false },
  { name: '人才补贴', frequency: 'yearly', duration: 'firstYearOnly', durationYears: 1, certainty: 'possible', included: false },
  { name: '签字费', frequency: 'once', duration: 'firstYearOnly', durationYears: 1, certainty: 'confirmed', included: false },
  { name: '搬家补贴', frequency: 'once', duration: 'firstYearOnly', durationYears: 1, certainty: 'confirmed', included: false },
]

interface Props {
  tag: 'A' | 'B'
  offer: Offer
  policy: CityPolicy | null
  errors: string[]
  accent: keyof typeof ACCENTS
  onChange: (patch: Partial<Offer>) => void
  onOpenPolicy: (cityCode: string) => void
}

export function OfferForm({ tag, offer, policy, errors, accent, onChange, onOpenPolicy }: Props) {
  const styles = ACCENTS[accent]
  const isCustomCity = offer.cityCode === 'custom'

  const patchSI = (p: Partial<OfferSocialInsurance>) =>
    onChange({ socialInsurance: { ...offer.socialInsurance, ...p } })
  const patchHF = (p: Partial<OfferHousingFund>) =>
    onChange({ housingFund: { ...offer.housingFund, ...p } })

  const handleCityChange = (code: string) => {
    onChange({
      cityCode: code,
      cityCustomName: code === 'custom' ? offer.cityCustomName || '' : '',
      // 切换城市后重置手动参数，让政策参数自动填充
      socialInsurance: {
        useCityDefault: code !== 'custom',
        pensionBase: null,
        medicalBase: null,
        unemploymentBase: null,
      },
      housingFund: { base: null, employeeRate: null, employerRate: null },
    })
  }

  const salaryInvalid = errors.some((e) => e.includes('月薪'))

  return (
    <div className="flex flex-col gap-4 p-5">
      {/* 头部 */}
      <div className="flex items-center gap-2.5">
        <span
          className={`num flex h-8 w-8 shrink-0 font-mono tracking-wider items-center justify-center rounded-lg border text-sm font-bold ${styles.chip}`}
        >
          {tag}
        </span>
        <div className="min-w-0 flex-1">
          <input
            type="text"
            value={offer.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Offer 名称"
            className="w-full border-0 bg-transparent p-0 text-[15px] font-semibold text-cream-50 outline-none placeholder:text-cream-600"
          />
        </div>
      </div>
      <TextInput
        value={offer.companyName}
        onChange={(v) => onChange({ companyName: v })}
        placeholder="公司名称（选填）"
      />

      {errors.length > 0 && (
        <Alert tone="error">
          <ul className="list-inside list-disc space-y-0.5">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </Alert>
      )}

      {/* 基础信息 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <FieldLabel>工作城市</FieldLabel>
          <Select value={offer.cityCode} onChange={handleCityChange} options={CITY_OPTIONS} />
          {isCustomCity && (
            <div className="mt-1.5">
              <TextInput
                value={offer.cityCustomName || ''}
                onChange={(v) => onChange({ cityCustomName: v })}
                placeholder="填写城市名称，如：苏州"
              />
            </div>
          )}
          {!isCustomCity && (
            <button
              type="button"
              onClick={() => onOpenPolicy(offer.cityCode)}
              className="mt-1.5 text-xs font-medium text-gold-600 hover:text-gold-700 hover:underline"
            >
              使用 {policy?.version ?? '—'} 政策估算（演示数据）· 查看政策 &gt;
            </button>
          )}
        </div>
        <div>
          <FieldLabel>税前月薪</FieldLabel>
          <NumberInput
            prefix="¥"
            suffix="/ 月"
            placeholder="25,000"
            value={offer.monthlySalary}
            invalid={salaryInvalid}
            onChange={(v) => onChange({ monthlySalary: v })}
          />
        </div>
        <div>
          <FieldLabel>全年固定工资月数</FieldLabel>
          <MonthSelect offer={offer} onChange={onChange} />
        </div>
        <div>
          <FieldLabel hint="如 HR 说 2 个月年终奖且写进 Offer，填这里；只口头说「大概 1～2 个月」的放浮动奖金">
            固定奖金
          </FieldLabel>
          <div className="flex gap-2">
            <Segmented<BonusMode>
              size="sm"
              value={offer.fixedBonus.mode}
              onChange={(m) => onChange({ fixedBonus: { ...offer.fixedBonus, mode: m } })}
              options={[
                { value: 'amount', label: '金额' },
                { value: 'months', label: '月数' },
              ]}
            />
            {offer.fixedBonus.mode === 'amount' ? (
              <NumberInput
                prefix="¥"
                placeholder="30,000"
                value={offer.fixedBonus.value}
                onChange={(v) => onChange({ fixedBonus: { ...offer.fixedBonus, value: v } })}
              />
            ) : (
              <NumberInput
                suffix="个月工资"
                placeholder="2"
                value={offer.fixedBonus.value}
                onChange={(v) => onChange({ fixedBonus: { ...offer.fixedBonus, value: v } })}
              />
            )}
          </div>
        </div>
      </div>

      {/* 浮动奖金 */}
      <div className="rounded-xl bg-black/[0.03] p-3">
        <Checkbox
          checked={offer.hasVariableBonus}
          onChange={(v) => onChange({ hasVariableBonus: v })}
          label={<span className="font-medium text-cream-200">有浮动奖金（如「2～4 个月」）</span>}
        />
        {offer.hasVariableBonus && (
          <div className="mt-2.5">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs text-cream-400">分别填写保守 / 正常 / 乐观值</span>
              <Segmented<BonusMode>
                size="sm"
                value={offer.variableBonus.expected.mode}
                onChange={(m) =>
                  onChange({
                    variableBonus: {
                      conservative: { ...offer.variableBonus.conservative, mode: m },
                      expected: { ...offer.variableBonus.expected, mode: m },
                      optimistic: { ...offer.variableBonus.optimistic, mode: m },
                    },
                  })
                }
                options={[
                  { value: 'amount', label: '金额' },
                  { value: 'months', label: '月数' },
                ]}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['conservative', 'expected', 'optimistic'] as const).map((k) => (
                <div key={k}>
                  <div className="mb-1 text-xs text-cream-400">
                    {{ conservative: '保守', expected: '正常', optimistic: '乐观' }[k]}
                  </div>
                  {offer.variableBonus[k].mode === 'amount' ? (
                    <NumberInput
                      prefix="¥"
                      placeholder="0"
                      value={offer.variableBonus[k].value}
                      onChange={(v) =>
                        onChange({
                          variableBonus: { ...offer.variableBonus, [k]: { ...offer.variableBonus[k], value: v } },
                        })
                      }
                    />
                  ) : (
                    <NumberInput
                      suffix="个月"
                      placeholder="0"
                      value={offer.variableBonus[k].value}
                      onChange={(v) =>
                        onChange({
                          variableBonus: { ...offer.variableBonus, [k]: { ...offer.variableBonus[k], value: v } },
                        })
                      }
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 试用期 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel hint="入职第一年的试用期月数，折扣只影响首年收入">试用期月数</FieldLabel>
          <NumberInput
            suffix="个月（0 = 无）"
            placeholder="0"
            value={offer.probation.months}
            onChange={(v) =>
              onChange({ probation: { ...offer.probation, months: v == null ? 0 : Math.round(v) } })
            }
          />
        </div>
        <div>
          <FieldLabel>试用期工资比例</FieldLabel>
          <ProbationRatio offer={offer} onChange={onChange} />
        </div>
      </div>

      {/* 五险一金 */}
      <div className="rounded-xl border border-black/10 p-3.5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-cream-100">五险一金</span>
            {policy ? (
              <Badge tone={policy.demo ? 'amber' : 'green'}>
                {policy.demo ? '演示数据' : '已核验'} · {policy.cityName}
              </Badge>
            ) : (
              <Badge tone="red">无政策数据</Badge>
            )}
          </div>
          {policy && (
            <button
              type="button"
              onClick={() => onOpenPolicy(offer.cityCode)}
              className="text-xs font-medium text-gold-600 hover:underline"
            >
              查看政策 &gt;
            </button>
          )}
        </div>

        {policy ? (
          <div className="space-y-2.5">
            <div className="text-[13px] text-cream-300">
              ✓ 使用「{policy.cityName}」当前政策估算
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <RadioRow
                checked={offer.socialInsurance.useCityDefault}
                onChange={(v) => patchSI({ useCityDefault: v })}
                title="按工资实际金额估算"
                desc="以当月实际工资作为缴费基数，按政策上下限自动调整"
              />
              <RadioRow
                checked={!offer.socialInsurance.useCityDefault}
                onChange={(v) => patchSI({ useCityDefault: !v })}
                title="我知道具体缴费基数"
                desc="按公司实际申报基数手动填写（如按最低基数缴纳）"
              />
            </div>
            {offer.socialInsurance.useCityDefault && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13px] text-cream-300">公积金比例</span>
                <div className="w-40">
                  <HFRateSelect offer={offer} policy={policy} onChange={patchHF} />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-[13px] text-cream-300">
            请在下方手动填写该城市的五险一金参数（比例与基数）
          </div>
        )}

        {/* 高级设置 */}
        {(!offer.socialInsurance.useCityDefault || isCustomCity) && (
          <div className="mt-3 space-y-3 border-t border-dashed border-black/10 pt-3">
            <div className="text-xs font-semibold text-cream-400">手动参数（超出政策范围将自动按上下限计算）</div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <BaseField
                label="养老基数"
                value={offer.socialInsurance.pensionBase ?? null}
                min={policy?.pension.baseMin}
                max={policy?.pension.baseMax}
                onChange={(v) => patchSI({ pensionBase: v })}
              />
              <BaseField
                label="医疗基数"
                value={offer.socialInsurance.medicalBase ?? null}
                min={policy?.medical.baseMin}
                max={policy?.medical.baseMax}
                onChange={(v) => patchSI({ medicalBase: v })}
              />
              <BaseField
                label="失业基数"
                value={offer.socialInsurance.unemploymentBase ?? null}
                min={policy?.unemployment.baseMin}
                max={policy?.unemployment.baseMax}
                onChange={(v) => patchSI({ unemploymentBase: v })}
              />
              <BaseField
                label="公积金基数"
                value={offer.housingFund.base ?? null}
                min={policy?.housingFund.baseMin}
                max={policy?.housingFund.baseMax}
                onChange={(v) => patchHF({ base: v })}
              />
            </div>
            {isCustomCity ? (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <RateField label="养老个人" value={offer.socialInsurance.pensionRates?.employee ?? null} onChange={(v) => patchSI({ pensionRates: { ...(offer.socialInsurance.pensionRates || { employee: null, employer: null }), employee: v } })} />
                <RateField label="养老单位" value={offer.socialInsurance.pensionRates?.employer ?? null} onChange={(v) => patchSI({ pensionRates: { ...(offer.socialInsurance.pensionRates || { employee: null, employer: null }), employer: v } })} />
                <RateField label="医疗个人" value={offer.socialInsurance.medicalRates?.employee ?? null} onChange={(v) => patchSI({ medicalRates: { ...(offer.socialInsurance.medicalRates || { employee: null, employer: null }), employee: v } })} />
                <RateField label="医疗单位" value={offer.socialInsurance.medicalRates?.employer ?? null} onChange={(v) => patchSI({ medicalRates: { ...(offer.socialInsurance.medicalRates || { employee: null, employer: null }), employer: v } })} />
                <RateField label="失业个人" value={offer.socialInsurance.unemploymentRates?.employee ?? null} onChange={(v) => patchSI({ unemploymentRates: { ...(offer.socialInsurance.unemploymentRates || { employee: null, employer: null }), employee: v } })} />
                <RateField label="失业单位" value={offer.socialInsurance.unemploymentRates?.employer ?? null} onChange={(v) => patchSI({ unemploymentRates: { ...(offer.socialInsurance.unemploymentRates || { employee: null, employer: null }), employer: v } })} />
                <RateField label="公积金个人" value={offer.housingFund.employeeRate ?? null} onChange={(v) => patchHF({ employeeRate: v })} />
                <RateField label="公积金单位" value={offer.housingFund.employerRate ?? null} onChange={(v) => patchHF({ employerRate: v })} />
              </div>
            ) : policy ? (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <RateField
                  label="公积金个人"
                  value={offer.housingFund.employeeRate ?? null}
                  onChange={(v) => patchHF({ employeeRate: v })}
                  placeholder={`${Math.round(policy.housingFund.employeeRateDefault * 100)}`}
                />
                <RateField
                  label="公积金单位"
                  value={offer.housingFund.employerRate ?? null}
                  onChange={(v) => patchHF({ employerRate: v })}
                  placeholder={`${Math.round(policy.housingFund.employerRateDefault * 100)}`}
                />
                <div className="col-span-2 self-end text-xs text-cream-500">
                  留空则使用政策默认比例（养老 8% / 医疗 {rateLabel(policy.medical.employeeRate)} 等）
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* 专项附加扣除 */}
      <div>
        <FieldLabel hint="如子女教育、住房租金、住房贷款利息、赡养老人等，可填写预计每月可扣除金额">
          每月专项附加扣除（个税）
        </FieldLabel>
        <NumberInput
          prefix="¥"
          suffix="/ 月"
          placeholder="0"
          value={offer.monthlySpecialTaxDeduction}
          onChange={(v) => onChange({ monthlySpecialTaxDeduction: v })}
        />
      </div>

      {/* 现金补贴 */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <FieldLabel hint="「可能获得」的补贴默认不计入核心结果，勾选确认后才计入">现金补贴</FieldLabel>
          <span className="text-xs text-cream-500">{offer.subsidies.length} 项</span>
        </div>
        <div className="space-y-2">
          {offer.subsidies.map((s) => (
            <SubsidyRow
              key={s.id}
              subsidy={s}
              onChange={(ns) =>
                onChange({ subsidies: offer.subsidies.map((x) => (x.id === s.id ? ns : x)) })
              }
              onRemove={() => onChange({ subsidies: offer.subsidies.filter((x) => x.id !== s.id) })}
            />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {SUBSIDY_PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() =>
                onChange({
                  subsidies: [
                    ...offer.subsidies,
                    { ...p, id: newSubsidyId(), amount: null },
                  ],
                })
              }
              className="rounded-full border border-dashed border-cream-600 px-2.5 py-1 text-xs text-cream-400 transition hover:border-gold-500/70 hover:text-gold-600"
            >
              + {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* 生活成本 */}
      <div>
        <FieldLabel hint="只填写因为换工作而变化的部分，例如新城市房租减去现城市房租">
          工作变化带来的额外成本（元 / 月）
        </FieldLabel>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {LIVING_COST_KEYS.map((k) => (
            <div key={k}>
              <div className="mb-1 text-xs text-cream-400">{LIVING_COST_LABELS[k]}</div>
              <NumberInput
                prefix="¥"
                placeholder="0"
                value={offer.livingCosts[k]}
                onChange={(v) => onChange({ livingCosts: { ...offer.livingCosts, [k]: v } })}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ---------------- 子组件 ---------------- */

function RadioRow({
  checked,
  onChange,
  title,
  desc,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  title: string
  desc: string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(true)}
      className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-left transition ${
        checked ? 'border-gold-500/70 bg-gold-500/10' : 'border-black/10 bg-ink-850 hover:border-cream-600'
      }`}
    >
      <span
        className={`mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-2 ${
          checked ? 'border-gold-500' : 'border-cream-600'
        }`}
      >
        {checked && <span className="h-1.5 w-1.5 rounded-full bg-gold-500" />}
      </span>
      <span>
        <span className="block text-[13px] font-medium text-cream-100">{title}</span>
        <span className="block text-xs text-cream-500">{desc}</span>
      </span>
    </button>
  )
}

function MonthSelect({ offer, onChange }: { offer: Offer; onChange: (p: Partial<Offer>) => void }) {
  const presets = ['12', '13', '14', '15', '16']
  const isCustom = !presets.includes(String(offer.fixedSalaryMonths))
  return (
    <div className={isCustom ? 'flex gap-2' : ''}>
      <Select
        value={isCustom ? 'custom' : String(offer.fixedSalaryMonths)}
        onChange={(v) => onChange({ fixedSalaryMonths: v === 'custom' ? 13 : Number(v) })}
        options={[...presets.map((p) => ({ value: p, label: `${p} 个月` })), { value: 'custom', label: '自定义' }]}
      />
      {isCustom && (
        <NumberInput
          suffix="个月"
          value={offer.fixedSalaryMonths}
          onChange={(v) => onChange({ fixedSalaryMonths: v == null ? 12 : Math.round(v) })}
        />
      )}
    </div>
  )
}

function ProbationRatio({ offer, onChange }: { offer: Offer; onChange: (p: Partial<Offer>) => void }) {
  const ratio = offer.probation.salaryRatio
  const key = ratio === 1 ? '1' : ratio === 0.8 ? '0.8' : ratio === 0.9 ? '0.9' : 'custom'
  const disabled = offer.probation.months === 0
  return (
    <div className={key === 'custom' && !disabled ? 'flex gap-2' : ''}>
      <Select
        value={key}
        disabled={disabled}
        onChange={(v) => {
          if (v === 'custom') return
          onChange({ probation: { ...offer.probation, salaryRatio: Number(v) } })
        }}
        options={[
          { value: '1', label: '无折扣（100%）' },
          { value: '0.8', label: '80%' },
          { value: '0.9', label: '90%' },
          { value: 'custom', label: '自定义' },
        ]}
      />
      {key === 'custom' && !disabled && (
        <NumberInput
          suffix="%"
          value={Math.round(ratio * 1000) / 10}
          onChange={(v) =>
            onChange({ probation: { ...offer.probation, salaryRatio: v == null ? 0.9 : v / 100 } })
          }
        />
      )}
    </div>
  )
}

function HFRateSelect({
  offer,
  policy,
  onChange,
}: {
  offer: Offer
  policy: CityPolicy
  onChange: (p: Partial<OfferHousingFund>) => void
}) {
  const min = Math.round(policy.housingFund.rateMin * 100)
  const max = Math.round(policy.housingFund.rateMax * 100)
  const current = offer.housingFund.employeeRate
  const value = current == null ? 'default' : String(Math.round(current * 100))
  const options = [
    { value: 'default', label: `默认 ${Math.round(policy.housingFund.employeeRateDefault * 100)}%` },
    ...Array.from({ length: Math.max(0, max - min + 1) }, (_, i) => {
      const pct = min + i
      return { value: String(pct), label: `${pct}%` }
    }),
  ]
  return (
    <Select
      value={options.some((o) => o.value === value) ? value : 'default'}
      onChange={(v) =>
        v === 'default'
          ? onChange({ employeeRate: null, employerRate: null })
          : onChange({ employeeRate: Number(v) / 100, employerRate: Number(v) / 100 })
      }
      options={options}
    />
  )
}

function BaseField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string
  value: number | null
  onChange: (v: number | null) => void
  min?: number
  max?: number
}) {
  const clampNote =
    value != null && min != null && max != null && max > min && value > 0
      ? value > max
        ? `将按上限 ${fmtCNY(max)} 计费`
        : value < min
          ? `将按下限 ${fmtCNY(min)} 计费`
          : null
      : null
  return (
    <div>
      <div className="mb-1 text-xs text-cream-400">{label}</div>
      <NumberInput prefix="¥" placeholder="0" value={value} onChange={onChange} />
      <div className="mt-1 min-h-[16px] text-[11px] leading-4">
        {clampNote ? (
          <span className="text-amber-600">{clampNote}</span>
        ) : min != null && max != null && max > min ? (
          <span className="text-cream-500">
            政策范围 {fmtCNY(min)}～{fmtCNY(max)}
          </span>
        ) : null}
      </div>
    </div>
  )
}

function RateField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: number | null
  onChange: (v: number | null) => void
  placeholder?: string
}) {
  return (
    <div>
      <div className="mb-1 text-xs text-cream-400">{label}</div>
      <NumberInput
        suffix="%"
        placeholder={placeholder ?? '0'}
        value={value == null ? null : Math.round(value * 1000) / 10}
        onChange={(v) => onChange(v == null ? null : v / 100)}
      />
    </div>
  )
}

function SubsidyRow({
  subsidy,
  onChange,
  onRemove,
}: {
  subsidy: Subsidy
  onChange: (s: Subsidy) => void
  onRemove: () => void
}) {
  const s = subsidy
  return (
    <div className="rounded-xl border border-black/10 p-2.5">
      <div className="flex items-center gap-2">
        <div className="w-24 shrink-0">
          <TextInput value={s.name} onChange={(v) => onChange({ ...s, name: v })} placeholder="名称" />
        </div>
        <div className="min-w-0 flex-1">
          <NumberInput
            prefix="¥"
            placeholder="金额"
            value={s.amount}
            onChange={(v) => onChange({ ...s, amount: v })}
          />
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 rounded-md px-1.5 py-1 text-cream-500 transition hover:bg-red-500/10 hover:text-red-600"
          title="删除"
        >
          ✕
        </button>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <Select
          value={s.frequency}
          onChange={(v) => onChange({ ...s, frequency: v as Subsidy['frequency'] })}
          options={[
            { value: 'monthly', label: '每月' },
            { value: 'yearly', label: '每年' },
            { value: 'once', label: '一次性' },
          ]}
        />
        <Select
          value={s.duration}
          onChange={(v) => onChange({ ...s, duration: v as Subsidy['duration'] })}
          options={[
            { value: 'firstYearOnly', label: '仅第一年' },
            { value: 'permanent', label: '长期持续' },
            { value: 'years', label: '指定年数' },
          ]}
        />
        {s.duration === 'years' ? (
          <NumberInput
            suffix="年"
            value={s.durationYears}
            onChange={(v) => onChange({ ...s, durationYears: v == null ? 1 : Math.max(1, Math.round(v)) })}
          />
        ) : (
          <Select
            value={s.certainty}
            onChange={(v) => onChange({ ...s, certainty: v as Subsidy['certainty'] })}
            options={[
              { value: 'confirmed', label: '确定获得' },
              { value: 'possible', label: '可能获得' },
            ]}
          />
        )}
      </div>
      {s.certainty === 'possible' && (
        <div className="mt-2">
          <Checkbox
            checked={s.included}
            onChange={(v) => onChange({ ...s, included: v })}
            label={<span className="text-amber-700">我确认自己符合条件，可以计入核心结果</span>}
          />
        </div>
      )}
    </div>
  )
}
