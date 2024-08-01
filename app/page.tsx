"use client"

import { useState, useEffect, useRef } from "react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import { ImperativePanelHandle } from 'react-resizable-panels';
import QuotedProjects from "@/components/quotedProjects";
import Construction from "@/components/construction";
import { supabase } from '../lib/supabaseClient'
import { Menu, X, Eye } from 'lucide-react';
import RotatePhone from "@/components/rotatePhoneAnimation";


// const QuotedProjects = () => <div className="h-full bg-gray-100 p-4">QuotedProjects Component</div>;
// const Construction = () => <div className="h-full bg-gray-200 p-4">Construction Component</div>;
// const Inspection = () => <div className="h-full bg-gray-300 p-4">Inspection Component</div>;

interface TableData {
  id: number;
  rows: { id: number, categoryDataId: number, value: string }[][];
  columns: { id: string, name: string }[];
  expandedRows: boolean[];
}

interface Section {
  id: number;
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
  const [sectionView, setSectionView] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [wasLandscape, setWasLandscape] = useState(false);


  const isLocalUpdateRef = useRef<boolean>(false);

  const panelRef = useRef<ImperativePanelHandle>(null);
  const projectsRowRef = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);

    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  useEffect(() => {
    const checkOrientation = () => {
      const isPortrait = window.matchMedia("(orientation: portrait)").matches;

      if (isPortrait) {
        if (wasLandscape) {
          setSectionView(null);
        }
        setIsVisible(true);
        setWasLandscape(false);
      } else {
        setIsVisible(false);
        setWasLandscape(true);
      }
    };

    // Check orientation immediately
    checkOrientation();

    // Add event listener for orientation changes
    const mediaQuery = window.matchMedia("(orientation: portrait)");
    mediaQuery.addListener(checkOrientation);

    // Cleanup function
    return () => {
      mediaQuery.removeListener(checkOrientation);
    };
  }, [wasLandscape, setSectionView]);


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
        <button onClick={() => handleNavigation('inspection')} className="text-white py-2 h-14">Inspection</button>
      </nav>
    </div>
  );


  const [projects, setProjects] = useState<Project[]>([
  ]);

  const [construction, setConstruction] = useState<Section[]>([]);

  const [inspection, setInspection] = useState<Section[]>([]);

  // For construction
  const fetchConstruction = () => fetchCategoryData('construction', setConstruction);

  // For inspection
  const fetchInspection = () => fetchCategoryData('inspection', setInspection);


  const fetchCategoryData = async (type: 'construction' | 'inspection', setData: React.Dispatch<React.SetStateAction<any[]>>) => {
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

  useEffect(() => {
    const fetchQuotedProjectsData = async () => {
      try {
        const { data, error } = await supabase
          .from('QuotedProjects')
          .select();

        if (error) {
          throw error;
        }

        const currentDate = new Date();
        const filteredProjects = [];

        for (const project of data) {
          const closingDate = project.closingDate ? new Date(project.closingDate + 'T00:00:00') : null;
          const closingTime = new Date(project.closingDate + 'T' + project.closingTime);

          if (closingDate && (closingDate > currentDate || (closingDate.toDateString() === currentDate.toDateString() && closingTime > currentDate))) {
            filteredProjects.push({
              ...project,
              closingDate: closingDate,
            });
          } else {
            // Delete project from database
            const { error: deleteError } = await supabase
              .from('QuotedProjects')
              .delete()
              .match({ id: project.id });

            if (deleteError) {
              console.error('Error deleting project:', deleteError);
            }
          }
        }

        setProjects(filteredProjects);
      } catch (error) {
        console.error('Error fetching or processing data:', error);
      }
    };

    const subscribeToConstructionData = (onUpdate: () => void): () => void => {
      const subscriptions: { unsubscribe: () => void }[] = [];

      const handleChange = async () => {
        onUpdate();
      };

      // Subscribe to Categories table
      const categoriesSubscription = supabase
        .channel('categories-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'Categories' },
          handleChange
        )
        .subscribe();

      subscriptions.push(categoriesSubscription);

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
        if (!isLocalUpdateRef.current) {
          console.log("updating quoted projects from DB");
          fetchQuotedProjectsData();
        } else {
          console.log("Local change");
        }

        isLocalUpdateRef.current = false;
      }).subscribe()

      return () => {
        supabase.removeChannel(channel);
      }
    }
    fetchQuotedProjectsData();
    subscribeDatabase();

    fetchConstruction();
    fetchInspection();
    subscribeToConstructionData(() => {
      console.log("About to update UI from database", isLocalUpdateRef.current);
      if (!isLocalUpdateRef.current) {
        fetchConstruction();
        fetchInspection();
      } else {
        console.log("Cancelled updating UI since local")
      }
      isLocalUpdateRef.current = false;
    });
  }, [])

  const handleEyeClick = (section: string) => {
    setSectionView(section);
    setIsVisible(true);
    // Alert.show('Please rotate your phone for a better experience.');
  }

  const handleBackClick = () => {
    setSectionView(null);
  };




  if (isMobile && !sectionView) {
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
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold mb-4">Projects</h2>
              <Eye onClick={() => handleEyeClick('projects')} />
            </div>
            <QuotedProjects projects={projects} setProjects={setProjects} isLocalUpdateRef={isLocalUpdateRef} projectsRowRef={projectsRowRef} />
          </section>
          <section id="construction" className="p-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold mb-4">Construction</h2>
              <Eye onClick={() => handleEyeClick('construction')} />
            </div>
            <Construction type="construction" styling="bg-green-200" sections={construction} setSections={setConstruction} isLocalUpdateRef={isLocalUpdateRef} isMobile={isMobile} />
          </section>
          <section id="inspection" className="p-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold mb-4">Inspection</h2>
              <Eye onClick={() => handleEyeClick('inspection')} />
            </div>
            <Construction styling={'bg-blue-200'} type={"industrial"} sections={inspection} setSections={setInspection} isLocalUpdateRef={isLocalUpdateRef} isMobile={isMobile} />
          </section>
        </div>
      </div>

    );
  }

  if (sectionView) {
    return (
      <>
        <RotatePhone isVisible={isVisible} setIsVisible={setIsVisible} />
        <div className="h-screen w-screen">
          <button onClick={handleBackClick}>Back to Mobile View</button>
          <div className="h-full w-full">
            {sectionView === 'projects' && (
              <QuotedProjects projects={projects} setProjects={setProjects} isLocalUpdateRef={isLocalUpdateRef} projectsRowRef={projectsRowRef} />
            )}
            {sectionView === 'construction' && (
              <Construction type="construction" styling="bg-green-200" sections={construction} setSections={setConstruction} isLocalUpdateRef={isLocalUpdateRef} isMobile={false} />
            )}
            {sectionView === 'inspection' && (
              <Construction styling={'bg-blue-200'} type={"industrial"} sections={inspection} setSections={setInspection} isLocalUpdateRef={isLocalUpdateRef} isMobile={false} />
            )}
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="h-screen w-screen">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        <ResizablePanel defaultSize={60}>
          <ResizablePanelGroup direction="vertical">
            <ResizablePanel defaultSize={50} className="!overflow-y-auto">
              <QuotedProjects projects={projects} setProjects={setProjects} isLocalUpdateRef={isLocalUpdateRef} projectsRowRef={projectsRowRef} />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={50} className="!overflow-y-auto" ref={panelRef}>
              <Construction type="construction" styling="bg-green-200" sections={construction} setSections={setConstruction} isLocalUpdateRef={isLocalUpdateRef} isMobile={false} />
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={40} className="!overflow-y-auto">
          <Construction styling={'bg-blue-200'} type={"industrial"} sections={inspection} setSections={setInspection} isLocalUpdateRef={isLocalUpdateRef} isMobile={false} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}