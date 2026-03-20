import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { BookOpen, TrendingUp, Calendar, CheckCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format, subDays } from 'date-fns'
import { es } from 'date-fns/locale'

export default function Dashboard() {
  const { user } = useAuth()
  const [blocks, setBlocks] = useState([])
  const [dailyStats, setDailyStats] = useState([])
  const [recentAttempts, setRecentAttempts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [user])

  const loadDashboardData = async () => {
    try {
      // Cargar bloques
      const { data: blocksData } = await supabase
        .from('exam_blocks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      setBlocks(blocksData || [])

      // Cargar estadísticas diarias (últimos 30 días)
      const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd')
      const { data: statsData } = await supabase
        .from('daily_stats')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', thirtyDaysAgo)
        .order('date', { ascending: true })

      setDailyStats(statsData || [])

      // Cargar últimos 5 intentos
      const { data: attemptsData } = await supabase
        .from('exam_attempts')
        .select(`
          *,
          exam_blocks(name)
        `)
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(5)

      setRecentAttempts(attemptsData || [])
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const totalQuestionsAnswered = dailyStats.reduce((sum, day) => sum + day.questions_answered, 0)
  const totalQuestionsCorrect = dailyStats.reduce((sum, day) => sum + day.questions_correct, 0)
  const accuracyRate = totalQuestionsAnswered > 0 
    ? Math.round((totalQuestionsCorrect / totalQuestionsAnswered) * 100) 
    : 0

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Resumen de tu progreso y actividad</p>
      </div>

      {/* Estadísticas resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BookOpen className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Bloques</p>
              <p className="text-2xl font-semibold text-gray-900">{blocks.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Preguntas totales</p>
              <p className="text-2xl font-semibold text-gray-900">{totalQuestionsAnswered}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Tasa de acierto</p>
              <p className="text-2xl font-semibold text-gray-900">{accuracyRate}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Calendar className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Intentos</p>
              <p className="text-2xl font-semibold text-gray-900">{recentAttempts.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de actividad */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Actividad de los últimos 30 días</h2>
        {dailyStats.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(date) => format(new Date(date), 'dd MMM', { locale: es })}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(date) => format(new Date(date), 'dd MMMM yyyy', { locale: es })}
              />
              <Bar dataKey="questions_answered" fill="#3b82f6" name="Preguntas respondidas" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 text-center py-8">No hay datos de actividad aún</p>
        )}
      </div>

      {/* Bloques disponibles */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Tus bloques de exámenes</h2>
          <Link
            to="/blocks"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Ver todos →
          </Link>
        </div>
        {blocks.length > 0 ? (
          <div className="space-y-3">
            {blocks.slice(0, 5).map((block) => (
              <Link
                key={block.id}
                to={`/blocks/${block.id}`}
                className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <h3 className="font-medium text-gray-900">{block.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{block.total_questions} preguntas</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No tienes bloques de examen aún</p>
            <Link
              to="/blocks"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Importar primer bloque
            </Link>
          </div>
        )}
      </div>

      {/* Últimos intentos */}
      {recentAttempts.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Últimos intentos</h2>
          <div className="space-y-3">
            {recentAttempts.map((attempt) => (
              <div
                key={attempt.id}
                className="flex justify-between items-center p-4 border border-gray-200 rounded-lg"
              >
                <div>
                  <h3 className="font-medium text-gray-900">{attempt.exam_blocks.name}</h3>
                  <p className="text-sm text-gray-500">
                    {format(new Date(attempt.started_at), "dd MMM yyyy 'a las' HH:mm", { locale: es })}
                  </p>
                </div>
                <div className="text-right">
                  {attempt.status === 'completed' ? (
                    <p className="text-lg font-semibold text-gray-900">
                      {attempt.score}/{attempt.total_questions}
                    </p>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                      En progreso
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
