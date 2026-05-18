import UserManagement from '@/components/admin/UserManagement'
import Layout from '@/layoutWrapper'

export default function AdminUsersPage() {
  return (
    <Layout currentPageName="admin-users">
      <UserManagement />
    </Layout>
  )
}
