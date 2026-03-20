import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Upload, BookOpen, Trash2 } from 'lucide-react'

export default function Blocks() {
  const { user } = useAuth()
  const [blocks, setBlocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadBlocks()
  }, [user])

  const loadBlocks = async () => {
    try {
      const { data, error } = await supabase
        .from('exam_blocks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setBlocks(data || [])
    } catch (error) {
      console.error('Error loading blocks:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError('')

    try {
      const text = await file.text()
      const questions = JSON.parse(text)

      if (!Array.isArray(questions)) {
        throw new Error('El JSON debe ser un array de preguntas')
      }

      // Validar estructura básica
      const firstQuestion = questions[0]
      if (!firstQuestion.question || !firstQuestion.options || !firstQuestion.correct_answer) {
        throw new Error('Estructura de JSON inválida. Revisa el formato.')
      }

      const blockName = prompt('Nombre del bloque de examen:')
      if (!blockName) {
        setUploading(false)
        return
      }

      // Crear bloque
      const { data: blockData, error: blockError } = await supabase
        .from('exam_blocks')
        .insert({
          user_id: user.id,
          name: blockName,
          description: `${questions.length} preguntas`,
          total_questions: 0 // Se actualizará automáticamente con el trigger
        })
        .select()
        .single()

      if (blockError) throw blockError

      // Insertar preguntas
      const questionsToInsert = questions.map((q) => ({
        exam_block_id: blockData.id,
        question_number: q.id,
        question_text: q.question,
        options: q.options,
        correct_answer: q.correct_answer
      }))

      const { error: questionsError } = await supabase
        .from('questions')
        .insert(questionsToInsert)

      if (questionsError) throw questionsError

      await loadBlocks()
      event.target.value = '' // Reset input
    } catch (error) {
      console.error('Error uploading file:', error)
      setError(error.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteBlock = async (blockId, blockName) => {
    if (!confirm(`¿Seguro que quieres eliminar "${blockName}"? Esta acción no se puede deshacer.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('exam_blocks')
        .delete()
        .eq('id', blockId)

      if (error) throw error
      await loadBlocks()
    } catch (error) {
      console.error('Error deleting block:', error)
      alert('Error al eliminar el bloque')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bloques de exámenes</h1>
          <p className="mt-2 text-gray-600">Gestiona tus conjuntos de preguntas</p>
        </div>
        <label className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 cursor-pointer">
          <Upload className="w-4 h-4 mr-2" />
          {uploading ? 'Importando...' : 'Importar JSON'}
          <input
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileUpload}
            disabled={uploading}
          />
        </label>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {blocks.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay bloques</h3>
          <p className="mt-1 text-sm text-gray-500">Comienza importando un archivo JSON con preguntas</p>
          <div className="mt-6">
            <label className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 cursor-pointer">
              <Upload className="w-4 h-4 mr-2" />
              Importar JSON
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </label>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {blocks.map((block) => (
            <div
              key={block.id}
              className="bg-white rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{block.name}</h3>
                  <button
                    onClick={() => handleDeleteBlock(block.id, block.name)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {block.description && (
                  <p className="text-sm text-gray-500 mb-4">{block.description}</p>
                )}
                <div className="flex items-center text-sm text-gray-500 mb-4">
                  <BookOpen className="w-4 h-4 mr-1" />
                  <span>{block.total_questions} preguntas</span>
                </div>
                <Link
                  to={`/blocks/${block.id}`}
                  className="block w-full text-center px-4 py-2 border border-blue-600 text-sm font-medium rounded-md text-blue-600 hover:bg-blue-50"
                >
                  Ver detalles
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Formato de ejemplo */}
      <div className="mt-12 bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Formato del JSON</h3>
        <p className="text-sm text-gray-600 mb-4">
          El archivo JSON debe tener este formato:
        </p>
        <pre className="bg-white p-4 rounded border border-gray-200 text-xs overflow-x-auto">
{`[
  {
    "id": 1,
    "question": "¿Cuál es la respuesta correcta?",
    "options": {
      "A": "Opción A",
      "B": "Opción B",
      "C": "Opción C"
    },
    "correct_answer": "B"
  }
]`}
        </pre>
      </div>
    </div>
  )
}
