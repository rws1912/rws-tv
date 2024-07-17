"use client"

import { useState, useEffect } from "react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import QuotedProjects from "@/components/quotedProjects";
import Construction from "@/components/construction";
import Inspection from "@/components/inspection";
import { supabase } from '../lib/supabaseClient'
import { Menu, X } from 'lucide-react'; // Assuming you're using Lucide icons


// const QuotedProjects = () => <div className="h-full bg-gray-100 p-4">QuotedProjects Component</div>;
// const Construction = () => <div className="h-full bg-gray-200 p-4">Construction Component</div>;
// const Inspection = () => <div className="h-full bg-gray-300 p-4">Inspection Component</div>;

interface TableData {
  id: string;
  rows: string[][];
  columns: {id: string, name: string}[];
  expandedRows: boolean[];
}

interface Section {
  id: string;
  header: string;
  table: TableData;
}

interface Project {
  id: number;
  quotationRef: string;
  name: string;
  location: string;
  closingDate: Date;
  closingTime: string;
}

export default function Home() {
  const [isMobile, setIsMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768); // Adjust this breakpoint as needed
    };

    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);

    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  const handleNavigation = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  const MobileMenu = () => (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 z-50">
      <div className="flex justify-end p-4">
        <button onClick={() => setMenuOpen(false)} className="text-white">
          <X size={24} />
        </button>
      </div>
      <nav className="flex flex-col items-center">
        <button onClick={() => handleNavigation('projects')} className="text-white py-2">Projects</button>
        <button onClick={() => handleNavigation('construction')} className="text-white py-2">Construction</button>
        <button onClick={() => handleNavigation('inspection')} className="text-white py-2">Inspection</button>
      </nav>
    </div>
  );


  const [projects, setProjects] = useState<Project[]>([
  ]);

  const [construction, setConstruction] = useState<Section[]>([
    // {
    //   id: '1',
    //   header: "Approved Drawing",
    //   table: {
    //     id: '1',
    //     rows: [
    //       ['first row', '123'],
    //       ['second row', '456']
    //     ],
    //     columns: ['Id', 'Date'],
    //     expandedRows: [false, false]
    //   },
    // },
    // {
    //   id: '2',
    //   header: 'Shop Fabrication',
    //   table: {
    //     id: '2',
    //     rows: [['']],
    //     columns: ['Column 1'],
    //     expandedRows: [false]
    //   }
    // }
  ]);

  const [inspection, setInspection] = useState<Section[]>([
    // {
    //   id: '1',
    //   header: "Shopwork",
    //   table: {
    //     id: '1',
    //     rows: [
    //       ['JOBSITE', '182A9851', 'FREE REPAIR EDL240S'],
    //     ],
    //     columns: ['Company', 'Job Number', 'Description'],
    //     expandedRows: [false]
    //   },
    // },
  ]);

  useEffect(() => {
    const fetchQuotedProjectsData = async () => {
      const { data, error } = await supabase
        .from('QuotedProjects')
        .select();

      if (error) {
        console.error('Error fetching data:', error);
      } else {
        const projectsWithDateObjects = data.map(project => ({
          ...project,
          closingDate: project.closingDate ? new Date(project.closingDate) : null
        }));
        setProjects(projectsWithDateObjects);
      }
    }

    const fetchConstruction = async () => {
      try {
        // Fetch categories
        const { data: categories, error: categoriesError } = await supabase
          .from('Categories')
          .select('*')
          .eq('type', 'construction')

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
                value,
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
            return row.CategoryDataValues.map(cdv => cdv.value)
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

        setConstruction(result);
        console.log("result", result);
        return result

      } catch (error) {
        console.error('Error fetching construction data:', error)
        return []
      }
    }

    const subscribeToConstructionData = (onUpdate: (data: Section[]) => void): () => void => {
      const subscriptions: { unsubscribe: () => void }[] = [];
    
      const handleChange = async () => {
        console.log("update noticed");
        const newData = await fetchConstruction();
        onUpdate(newData);
      };
    
      // Subscribe to Categories table
      // const categoriesSubscription = supabase
      //   .channel('categories-changes')
      //   .on(
      //     'postgres_changes',
      //     { event: '*', schema: 'public', table: 'Categories' },
      //     handleChange
      //   )
      //   .subscribe();
    
      // subscriptions.push(categoriesSubscription);
    
      // Subscribe to CategoryDataValues table
      const categoryDataValuesSubscription = supabase
        .channel('category-data-values-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'CategoryDataValues' },
          handleChange
        )
        .subscribe();
    
      subscriptions.push(categoryDataValuesSubscription);
    
      // Subscribe to ColumnDefinitions table
      const columnDefinitionsSubscription = supabase
        .channel('column-definitions-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'ColumnDefinitions' },
          handleChange
        )
        .subscribe();
    
      subscriptions.push(columnDefinitionsSubscription);
    
      // Return a function to unsubscribe from all channels
      return () => {
        subscriptions.forEach(subscription => subscription.unsubscribe());
      };
    };
    

    const subscribeDatabase = async () => {
      const channel = supabase.channel('quoted projects').on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'QuotedProjects'
      }, () => {
        fetchQuotedProjectsData();
      }).subscribe()

      return () => {
        supabase.removeChannel(channel);
      }
    }

    fetchQuotedProjectsData();
    subscribeDatabase();

    fetchConstruction();
    subscribeToConstructionData((newData) => {
      console.log(newData)
    });
  }, [])




  if (isMobile) {
    return (
      <div className="h-screen w-screen flex flex-col">
        <header className="bg-gray-800 text-white p-4 flex justify-between items-center">
          <h1>Project Management</h1>
          <button onClick={() => setMenuOpen(true)}>
            <Menu size={24} />
          </button>
        </header>
        {menuOpen && <MobileMenu />}
        <div className="flex-1 overflow-y-auto">
          <section id="projects" className="p-4">
            <h2 className="text-xl font-bold mb-4">Projects</h2>
            <QuotedProjects projects={projects} setProjects={setProjects} />
          </section>
          <section id="construction" className="p-4">
            <h2 className="text-xl font-bold mb-4">Construction</h2>
            <Construction type="construction" styling="bg-green-200" sections={construction} setSections={setConstruction} />
          </section>
          <section id="inspection" className="p-4">
            <h2 className="text-xl font-bold mb-4">Inspection</h2>
            <Construction styling={'bg-blue-200'} type={"inspection"} sections={inspection} setSections={setInspection} />
          </section>
        </div>
      </div>
    );
  }

  // Desktop layout with resizable panels
  return (
    <div className="h-screen w-screen">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        <ResizablePanel defaultSize={60}>
          <ResizablePanelGroup direction="vertical">
            <ResizablePanel defaultSize={50} className="!overflow-y-auto">
              <QuotedProjects projects={projects} setProjects={setProjects} />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={50} className="!overflow-y-auto">
              <Construction type="construction" styling="bg-green-200" sections={construction} setSections={setConstruction} />
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={40} className="!overflow-y-auto">
          <Construction styling={'bg-blue-200'} type={"inspection"} sections={inspection} setSections={setInspection} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}