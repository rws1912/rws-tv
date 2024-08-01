import { supabase } from "./supabaseClient"

export const fetchCategoryData = async (type: 'construction' | 'inspection', setData: React.Dispatch<React.SetStateAction<any[]>>) => {
    try {
        // Fetch categories
        const { data: categories, error: categoriesError } = await supabase
            .from('Categories')
            .select('*')
            .eq('type', type)
            .order('date_added', { ascending: true })

        if (categoriesError) throw categoriesError

        const result = await Promise.all(categories.map(async (category) => {
            // Fetch column definitions
            const { data: columnDefs, error: columnError } = await supabase
                .from('ColumnDefinitions')
                .select('*')
                .eq('category_id', category.id)
                .order('column_order')

            if (columnError) throw columnError

            // Fetch category data
            const { data: categoryData, error: dataError } = await supabase
                .from('CategoryData')
                .select(`
              id,
              row_number,
              CategoryDataValues (
                category_data_id,
                value,
                id,
                ColumnDefinitions (
                  column_name
                )
              )
            `)
                .eq('category_id', category.id)
                .order('row_number')

            if (dataError) throw dataError

            // Structure the rows
            const rows = categoryData.map(row => {
                return row.CategoryDataValues.map(cdv => {
                    return {
                        id: cdv.id,
                        categoryDataId: cdv.category_data_id,
                        value: cdv.value
                    }
                })
            })

            // Structure the result
            return {
                id: category.id.toString(),
                header: category.header,
                table: {
                    id: category.id.toString(),
                    rows: rows,
                    columns: columnDefs.map(cd => {
                        return {
                            id: cd.id,
                            name: cd.column_name
                        }
                    }),
                    expandedRows: new Array(rows.length).fill(false)
                }
            }
        }))

        setData(result);
        return result

    } catch (error) {
        console.error(`Error fetching ${type} data:`, error)
        return []
    }
}