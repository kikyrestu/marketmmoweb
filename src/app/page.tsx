import ItemList from '@/components/items/item-list'

export default function Page() {
  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">MMORPG Marketplace</h1>
      <ItemList />
    </main>
  )
}
