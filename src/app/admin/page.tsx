import AdminDashboard from '@/components/admin/AdminDashboard'
import Layout from '@/layoutWrapper'

export default function AdminPage() {
  return (
    <Layout currentPageName="admin">
      <AdminDashboard />
    </Layout>
  )
}
