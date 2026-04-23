import UserManagement from '@/components/admin/UserManagement'
import Layout from '@/layoutWrapper'

export default function AdminPage() {
  return (
    <Layout currentPageName="admin">
      <UserManagement />
    </Layout>
  )
}
