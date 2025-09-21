"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Send, Star, CheckCircle, Clock, AlertCircle, Bug, Lightbulb, Settings, MessageSquare, Zap, BarChart3, HelpCircle } from "lucide-react";
import Link from "next/link";

interface FeedbackForm {
  category: string;
  priority: string;
  subject: string;
  description: string;
  rating: number | null;
}

interface FeedbackItem {
  id: string;
  category: string;
  priority: string;
  subject: string;
  description: string;
  rating: number | null;
  status: string;
  created_at: string;
  updated_at: string;
}

const categories = [
  { value: 'bug', label: 'Bug Report', icon: Bug, description: 'Something is not working as expected' },
  { value: 'feature', label: 'Feature Request', icon: Lightbulb, description: 'Suggest a new feature or functionality' },
  { value: 'improvement', label: 'Improvement', icon: Zap, description: 'Enhance an existing feature' },
  { value: 'ui', label: 'User Interface', icon: Settings, description: 'Design or layout related feedback' },
  { value: 'performance', label: 'Performance', icon: BarChart3, description: 'Speed, loading, or optimization issues' },
  { value: 'general', label: 'General Feedback', icon: MessageSquare, description: 'General comments or suggestions' },
  { value: 'other', label: 'Other', icon: HelpCircle, description: 'Anything else not covered above' }
];

const priorities = [
  { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-800' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-800' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800' }
];

const statusColors = {
  open: 'bg-green-100 text-green-800',
  in_progress: 'bg-blue-100 text-blue-800',
  resolved: 'bg-purple-100 text-purple-800',
  closed: 'bg-gray-100 text-gray-800',
  duplicate: 'bg-yellow-100 text-yellow-800'
};

const statusIcons = {
  open: CheckCircle,
  in_progress: Clock,
  resolved: CheckCircle,
  closed: CheckCircle,
  duplicate: AlertCircle
};

export default function FeedbackPage() {
  const [formData, setFormData] = useState<FeedbackForm>({
    category: '',
    priority: 'medium',
    subject: '',
    description: '',
    rating: null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackHistory, setFeedbackHistory] = useState<FeedbackItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load feedback history on component mount
  useEffect(() => {
    const loadFeedbackHistory = async () => {
      try {
        const response = await fetch('/api/feedback');
        if (response.ok) {
          const data = await response.json();
          setFeedbackHistory(data.feedback || []);
        }
      } catch (error) {
        console.error('Error loading feedback history:', error);
      }
    };

    loadFeedbackHistory();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit feedback');
      }

      setIsSubmitted(true);
      setFormData({
        category: '',
        priority: 'medium',
        subject: '',
        description: '',
        rating: null
      });

      // Reload feedback history
      const historyResponse = await fetch('/api/feedback');
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        setFeedbackHistory(historyData.feedback || []);
      }

    } catch (error) {
      console.error('Feedback submission error:', error);
      setError(error instanceof Error ? error.message : "Failed to submit feedback");
    } finally {
      setIsSubmitting(false);
    }
  };


  const selectedCategory = categories.find(cat => cat.value === formData.category);

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card className="text-center">
              <CardContent className="p-8">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h1>
                <p className="text-gray-600 mb-6">
                  Your feedback has been submitted successfully. We&apos;ll review it and get back to you soon.
                </p>
                <div className="flex gap-4 justify-center">
                  <Button onClick={() => setIsSubmitted(false)}>
                    Submit Another
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/dashboard">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Dashboard
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowHistory(!showHistory)}
              >
                {showHistory ? 'Hide' : 'Show'} History ({feedbackHistory.length})
              </Button>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Feedback</h1>
            <p className="text-lg text-gray-600">
              Help us improve Binda by sharing your thoughts, reporting bugs, or suggesting new features
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Feedback Form */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Submit Feedback</CardTitle>
                  <CardDescription>
                    Tell us what&apos;s on your mind. Your feedback helps us make Binda better for everyone.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Category Selection */}
                    <div className="space-y-3">
                      <Label>What type of feedback is this? *</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {categories.map((category) => {
                          const IconComponent = category.icon;
                          return (
                            <div
                              key={category.value}
                              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                                formData.category === category.value
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                              onClick={() => setFormData(prev => ({ ...prev, category: category.value }))}
                            >
                              <div className="flex items-start gap-3">
                                <IconComponent className="w-5 h-5 text-gray-600 mt-0.5" />
                                <div>
                                  <h3 className="font-medium text-gray-900">{category.label}</h3>
                                  <p className="text-sm text-gray-600">{category.description}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Priority Selection */}
                    <div className="space-y-3">
                      <Label>Priority Level</Label>
                      <div className="flex gap-4">
                        {priorities.map((priority) => (
                          <button
                            key={priority.value}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, priority: priority.value }))}
                            className={`px-3 py-2 rounded-md border transition-all ${
                              formData.priority === priority.value
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <Badge className={priority.color}>
                              {priority.label}
                            </Badge>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Subject */}
                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject *</Label>
                      <Input
                        id="subject"
                        placeholder="Brief summary of your feedback"
                        value={formData.subject}
                        onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                        required
                      />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <Label htmlFor="description">Description *</Label>
                      <Textarea
                        id="description"
                        placeholder="Please provide as much detail as possible..."
                        rows={6}
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        required
                      />
                    </div>

                    {/* Rating */}
                    <div className="space-y-3">
                      <Label>Overall Rating (Optional)</Label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <button
                            key={rating}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, rating: rating }))}
                            className={`flex items-center gap-1 px-3 py-2 rounded-md border transition-all ${
                              formData.rating === rating
                                ? 'border-yellow-500 bg-yellow-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <Star className="w-4 h-4 text-yellow-500" />
                            {rating}
                          </button>
                        ))}
                      </div>
                    </div>

                    {error && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-600">{error}</p>
                      </div>
                    )}

                    <Button type="submit" disabled={isSubmitting || !formData.category || !formData.subject || !formData.description} className="w-full">
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Submit Feedback
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Selected Category Info */}
              {selectedCategory && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Selected Category</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start gap-3">
                      <selectedCategory.icon className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <h3 className="font-medium text-gray-900">{selectedCategory.label}</h3>
                        <p className="text-sm text-gray-600">{selectedCategory.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tips */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tips for Great Feedback</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <p className="text-sm text-gray-600">Be specific about what you experienced</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <p className="text-sm text-gray-600">Include steps to reproduce bugs</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <p className="text-sm text-gray-600">Explain the impact on your workflow</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <p className="text-sm text-gray-600">Suggest solutions if you have ideas</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Feedback History */}
          {showHistory && (
            <div className="mt-8">
              <Card>
                <CardHeader>
                  <CardTitle>Your Feedback History</CardTitle>
                  <CardDescription>
                    Track the status of your submitted feedback
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {feedbackHistory.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No feedback submitted yet
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {feedbackHistory.map((item) => {
                        const StatusIcon = statusIcons[item.status as keyof typeof statusIcons];
                        const category = categories.find(cat => cat.value === item.category);
                        
                        return (
                          <div key={item.id} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {category && <category.icon className="w-4 h-4 text-gray-600" />}
                                <h3 className="font-medium text-gray-900">{item.subject}</h3>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={statusColors[item.status as keyof typeof statusColors]}>
                                  <StatusIcon className="w-3 h-3 mr-1" />
                                  {item.status.replace('_', ' ')}
                                </Badge>
                                <span className="text-sm text-gray-500">
                                  {new Date(item.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>Category: {category?.label}</span>
                              <span>Priority: {item.priority}</span>
                              {item.rating && (
                                <span className="flex items-center gap-1">
                                  <Star className="w-3 h-3 text-yellow-500" />
                                  {item.rating}/5
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
