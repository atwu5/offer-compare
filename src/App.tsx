/**
 * 路由壳：生活计算工具箱。
 * hash 路由（#/、#/offer、#/tax…），零依赖；单文件构建与静态托管均可用。
 */
import { useEffect } from 'react'
import { useHashRoute } from './router'
import HomePage from './pages/HomePage'
import OfferComparePage from './pages/OfferComparePage'
import TaxCalculatorPage from './pages/TaxCalculatorPage'
import RetirementPage from './pages/RetirementPage'
import DaysAlivePage from './pages/DaysAlivePage'
import AnniversaryPage from './pages/AnniversaryPage'
import HourlyWagePage from './pages/HourlyWagePage'

export default function App() {
  const route = useHashRoute()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [route])

  if (route === '/offer') return <OfferComparePage />
  if (route === '/tax') return <TaxCalculatorPage />
  if (route === '/retire') return <RetirementPage />
  if (route === '/days') return <DaysAlivePage />
  if (route === '/anniversary') return <AnniversaryPage />
  if (route === '/wage') return <HourlyWagePage />
  return <HomePage />
}
