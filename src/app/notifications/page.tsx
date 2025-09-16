"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSession } from 'next-auth/react'
import { notifyBlogPost, notifyInfoUpdate, notifySystemAlert } from '@/lib/notification-helpers'

export default function NotificationsDemoPage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [notificationData, setNotificationData] = useState({
    type: 'BLOG_POST',
    title: '',
    message: ''
  })

  const handleSendNotification = async () => {
    if (!session?.user?.id || !notificationData.title || !notificationData.message) {
      return
    }

    setLoading(true)
    try {
      switch (notificationData.type) {
        case 'BLOG_POST':
          await notifyBlogPost(session.user.id, notificationData.title, 'demo-blog')
          break
        case 'INFO_UPDATE':
          await notifyInfoUpdate(session.user.id, notificationData.title, notificationData.message)
          break
        case 'SYSTEM_ALERT':
          await notifySystemAlert(session.user.id, notificationData.title, notificationData.message)
          break
      }

      setNotificationData({ ...notificationData, title: '', message: '' })
      alert('Notification sent! Check the bell icon in the navbar.')
    } catch (error) {
      console.error('Failed to send notification:', error)
      alert('Failed to send notification')
    } finally {
      setLoading(false)
    }
  }

  if (!session) {
    return (
      <div className="container py-10">
        <Card className="p-6">
          <p className="text-center">Please sign in to test notifications</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="container py-10">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Notification System Demo</h1>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Send Test Notification</h2>

          <div className="space-y-4">
            <div>
              <Label htmlFor="type">Notification Type</Label>
              <Select
                value={notificationData.type}
                onValueChange={(value) => setNotificationData({ ...notificationData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BLOG_POST">Blog Post</SelectItem>
                  <SelectItem value="INFO_UPDATE">Info Update</SelectItem>
                  <SelectItem value="SYSTEM_ALERT">System Alert</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={notificationData.title}
                onChange={(e) => setNotificationData({ ...notificationData, title: e.target.value })}
                placeholder="Notification title"
              />
            </div>

            <div>
              <Label htmlFor="message">Message</Label>
              <Input
                id="message"
                value={notificationData.message}
                onChange={(e) => setNotificationData({ ...notificationData, message: e.target.value })}
                placeholder="Notification message"
              />
            </div>

            <Button
              onClick={handleSendNotification}
              disabled={loading || !notificationData.title || !notificationData.message}
              className="w-full"
            >
              {loading ? 'Sending...' : 'Send Notification'}
            </Button>
          </div>
        </Card>

        <Card className="p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">How to Test</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Fill in the notification details above</li>
            <li>Click "Send Notification"</li>
            <li>Look for the bell icon in the navbar (top right)</li>
            <li>Click the bell to see your notifications</li>
            <li>You should see a toast notification and a badge on the bell</li>
          </ol>
        </Card>

        <Card className="p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">Notification Types</h2>
          <div className="space-y-3 text-sm">
            <div>
              <strong>Blog Post:</strong> Sent when new blog posts are published
            </div>
            <div>
              <strong>Info Update:</strong> General information updates from admins
            </div>
            <div>
              <strong>Chat Message:</strong> New messages from other users
            </div>
            <div>
              <strong>Transaction Update:</strong> Updates on your transactions
            </div>
            <div>
              <strong>Friend Request:</strong> When someone sends you a friend request
            </div>
            <div>
              <strong>System Alert:</strong> Important system notifications
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
