import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Upload, BookOpen, Trash2, FileText, X, Edit, Check, ChevronUp, ChevronDown } from 'lucide-react'

export default function Blocks() {
  const { user } = useAuth()
  const [blocks, setBlocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [showPasteModal, setShowPasteModal] = useState(false)
  const [pastedJson, setPastedJson] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [sortColumn, setSortColumn] = useState('created_at')
  const [sortDirection, setSortDirection] = useState('desc')
  const [editingBlock, setEditingBlock] = useState(null)
  const [editCategory, setEditCategory] = useState('')

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
      await processJsonImport(text)
      event.target.value = '' // Reset input
    } catch (error) {
      console.error('Error uploading file:', error)
      setError(error.message)
    } finally {
      setUploading(false)
    }
  }

  const handlePasteJson = async () => {
    if (!pastedJson.trim()) {
      setError('Por favor pega el JSON')
      return
    }

    setUploading(true)
    setError('')

    try {
      await processJsonImport(pastedJson)
      setShowPasteModal(false)
      setPastedJson('')
    } catch (error) {
      console.error('Error processing JSON:', error)
      setError(error.message)
    } finally {
      setUploading(false)
    }
  }

  const processJsonImport = async (jsonText) => {
    const questions = JSON.parse(jsonText)

    if (!Array.isArray(questions)) {
      throw new Error('El JSON debe ser un array de preguntas')
    }

    // Validar estructura básica
    const firstQuestion = questions[0]
    if (!firstQuestion.question || !firstQuestion.options || !firstQuestion.hasOwnProperty('correct_answer')) {
      throw new Error('Estructura de JSON inválida. Revisa el formato.')
    }

    const blockName = prompt('Nombre del bloque de examen:')
    if (!blockName) {
      throw new Error('Nombre cancelado')
    }

    const category = prompt('Categoría (ej: Data Cloud, Sales Cloud, Agentforce):') || 'Sin categoría'

    // Crear bloque
    const { data: blockData, error: blockError } = await supabase
      .from('exam_blocks')
      .insert({
        user_id: user.id,
        name: blockName,
        description: `${questions.length} preguntas`,
        category: category,
        total_questions: 0 // Se actualizará automáticamente con el trigger
      })
      .select()
      .single()

    if (blockError) throw blockError

    // Insertar preguntas (si correct_answer es null, usar 'A' por defecto)
    const questionsToInsert = questions.map((q) => ({
      exam_block_id: blockData.id,
      question_number: q.id,
      question_text: q.question,
      options: q.options,
      correct_answer: q.correct_answer || 'A' // Si es null, usa 'A' por defecto
    }))

    const { error: questionsError } = await supabase
      .from('questions')
      .insert(questionsToInsert)

    if (questionsError) throw questionsError

    await loadBlocks()
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

  const handleEditCategory = (block) => {
    setEditingBlock(block.id)
    setEditCategory(block.category || '')
  }

  const handleSaveCategory = async (blockId) => {
    try {
      const { error } = await supabase
        .from('exam_blocks')
        .update({ category: editCategory || null })
        .eq('id', blockId)

      if (error) throw error
      await loadBlocks()
      setEditingBlock(null)
      setEditCategory('')
    } catch (error) {
      console.error('Error updating category:', error)
      alert('Error al actualizar la categoría')
    }
  }

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  // Obtener categorías únicas
  const categories = [...new Set(blocks.map(b => b.category || 'Sin categoría').filter(Boolean))]

  // Filtrar y ordenar bloques
  const filteredAndSortedBlocks = blocks
    .filter(block => {
      if (filterCategory === 'all') return true
      const blockCategory = block.category || 'Sin categoría'
      return blockCategory === filterCategory
    })
    .sort((a, b) => {
      let aValue = a[sortColumn]
      let bValue = b[sortColumn]

      // Manejar valores null
      if (!aValue && sortColumn === 'category') aValue = 'Sin categoría'
      if (!bValue && sortColumn === 'category') bValue = 'Sin categoría'

      if (sortColumn === 'created_at') {
        aValue = new Date(aValue)
        bValue = new Date(bValue)
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

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
        <div className="flex gap-2">
          <button
            onClick={() => setShowPasteModal(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <FileText className="w-4 h-4 mr-2" />
            Pegar JSON
          </button>
          <label className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 cursor-pointer">
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? 'Importando...' : 'Subir archivo'}
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
        <>
          {/* Filtro por categoría */}
          <div className="mb-6 flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Filtrar por categoría:</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">Todas las categorías</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <span className="text-sm text-gray-500">
              {filteredAndSortedBlocks.length} de {blocks.length} bloques
            </span>
          </div>

          {/* Tabla de bloques */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    onClick={() => handleSort('name')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-2">
                      Nombre
                      {sortColumn === 'name' && (
                        sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('category')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-2">
                      Categoría
                      {sortColumn === 'category' && (
                        sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('total_questions')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-2">
                      Nº Preguntas
                      {sortColumn === 'total_questions' && (
                        sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('created_at')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-2">
                      Fecha creación
                      {sortColumn === 'created_at' && (
                        sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedBlocks.map((block) => (
                  <tr key={block.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        to={`/blocks/${block.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        {block.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingBlock === block.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                            placeholder="Categoría..."
                          />
                          <button
                            onClick={() => handleSaveCategory(block.id)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingBlock(null)}
                            className="text-gray-600 hover:text-gray-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-900">
                            {block.category || 'Sin categoría'}
                          </span>
                          <button
                            onClick={() => handleEditCategory(block)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {block.total_questions}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(block.created_at).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDeleteBlock(block.id, block.name)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
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
  },
  {
    "id": 2,
    "question": "Pregunta de selección múltiple",
    "options": {
      "A": "Opción A",
      "B": "Opción B",
      "C": "Opción C",
      "D": "Opción D"
    },
    "correct_answer": "B,D"
  }
]`}
        </pre>
      </div>

      {/* Modal para pegar JSON */}
      {showPasteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Pegar JSON</h2>
                <button
                  onClick={() => {
                    setShowPasteModal(false)
                    setPastedJson('')
                    setError('')
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <p className="text-sm text-gray-600 mb-4">
                Pega aquí el JSON con las preguntas. Debe ser un array de objetos con la estructura correcta.
              </p>

              {error && (
                <div className="mb-4 rounded-md bg-red-50 p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <textarea
                value={pastedJson}
                onChange={(e) => setPastedJson(e.target.value)}
                placeholder={`[
  {
    "id": 1,
    "question": "Pregunta aquí...",
    "options": {
      "A": "Opción A",
      "B": "Opción B",
      "C": "Opción C"
    },
    "correct_answer": "B"
  },
  {
    "id": 2,
    "question": "Pregunta múltiple...",
    "options": {
      "A": "Opción A",
      "B": "Opción B",
      "C": "Opción C",
      "D": "Opción D"
    },
    "correct_answer": "B,D"
  }
]`}
                className="w-full h-96 p-4 border border-gray-300 rounded-md font-mono text-sm"
                disabled={uploading}
              />
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowPasteModal(false)
                  setPastedJson('')
                  setError('')
                }}
                disabled={uploading}
                className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handlePasteJson}
                disabled={uploading || !pastedJson.trim()}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {uploading ? 'Importando...' : 'Importar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
