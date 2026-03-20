import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Play, Pause, History, ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function BlockDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [block, setBlock] = useState(null)
  const [attempts, setAttempts] = useState([])
  const [inProgressAttempt, setInProgressAttempt] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBlockData()
  }, [id, user])

  const loadBlockData = async () => {
    try {
      // Cargar bloque
      const { data: blockData, error: blockError } = await supabase
        .from('exam_blocks')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (blockError) throw blockError
      setBlock(blockData)

      // Cargar intentos
      const { data: attemptsData, error: attemptsError } = await supabase
        .from('exam_attempts')
        .select('*')
        .eq('exam_block_id', id)
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })

      if (attemptsError) throw attemptsError
      setAttempts(attemptsData || [])

      // Buscar intento en progreso
      const inProgress = attemptsData?.find(a => a.status === 'in_progress' || a.status === 'paused')
      setInProgressAttempt(inProgress || null)
    } catch (error) {
      console.error('Error loading block:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStartNewTest = async () => {
    try {
      const { data, error } = await supabase
        .from('exam_attempts')
        .insert({
          exam_block_id: id,
          user_id: user.id,
          status: 'in_progress',
          current_question_index: 0,
          total_questions: block.total_questions
        })
        .select()
        .single()

      if (error) throw error
      navigate(`/test/${data.id}`)
    } catch (error) {
      console.error('Error starting test:', error)
      alert('Error al iniciar el test')
    }
  }

  const handleContinueTest = () => {
    if (inProgressAttempt) {
      navigate(`/test/${inProgressAttempt.id}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!block) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-red-600">Bloque no encontrado</p>
      </div>
    )
  }

  const completedAttempts = attempts.filter(a => a.status === 'completed')
  const averageScore = completedAttempts.length > 0
    ? Math.round(completedAttempts.reduce((sum, a) => sum + a.score, 0) / completedAttempts.length)
    : 0

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        to="/blocks"
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Volver a bloques
      </Link>

      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">{block.name}</h1>
        {block.description && (
          <p className="text-gray-600 mb-6">{block.description}</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Total preguntas</p>
            <p className="text-2xl font-bold text-gray-900">{block.total_questions}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Intentos realizados</p>
            <p className="text-2xl font-bold text-gray-900">{completedAttempts.length}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Puntuación media</p>
            <p className="text-2xl font-bold text-gray-900">
              {completedAttempts.length > 0 ? `${averageScore}/${block.total_questions}` : '-'}
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          {inProgressAttempt ? (
            <button
              onClick={handleContinueTest}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
            >
              <Play className="w-5 h-5 mr-2" />
              Continuar test en progreso
            </button>
          ) : (
            <button
              onClick={handleStartNewTest}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <Play className="w-5 h-5 mr-2" />
              Iniciar nuevo test
            </button>
          )}
        </div>
      </div>

      {/* Historial de intentos */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <History className="w-5 h-5 mr-2" />
          Historial de intentos
        </h2>
        {attempts.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No hay intentos aún</p>
        ) : (
          <div className="space-y-3">
            {attempts.map((attempt) => (
              <div
                key={attempt.id}
                className="flex justify-between items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {format(new Date(attempt.started_at), "dd MMMM yyyy 'a las' HH:mm", { locale: es })}
                  </p>
                  {attempt.status === 'completed' && attempt.completed_at && (
                    <p className="text-sm text-gray-500">
                      Completado: {format(new Date(attempt.completed_at), "HH:mm", { locale: es })}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  {attempt.status === 'completed' ? (
                    <>
                      <p className="text-xl font-bold text-gray-900">
                        {attempt.score}/{attempt.total_questions}
                      </p>
                      <p className="text-sm text-gray-500">
                        {Math.round((attempt.score / attempt.total_questions) * 100)}% acierto
                      </p>
                      <Link
                        to={`/test/${attempt.id}/results`}
                        className="text-sm text-blue-600 hover:text-blue-700 mt-1 inline-block"
                      >
                        Ver detalles →
                      </Link>
                    </>
                  ) : (
                    <div className="flex flex-col items-end gap-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                        {attempt.status === 'paused' ? 'Pausado' : 'En progreso'}
                      </span>
                      <button
                        onClick={() => navigate(`/test/${attempt.id}`)}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        Continuar →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
