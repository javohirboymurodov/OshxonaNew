import React from 'react';

type Category = { _id: string; name: string };

interface CategoryFilterProps {
  categories: Category[];
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

export default function CategoryFilter({ categories, activeCategory, onCategoryChange }: CategoryFilterProps) {
  return (
    <div style={{ display:'flex', gap:8, overflowX:'auto', marginBottom:16, paddingBottom: 4 }}>
      <button 
        onClick={()=>onCategoryChange('all')} 
        style={{ 
          padding:'8px 12px', 
          borderRadius:20, 
          border:'1px solid #ddd', 
          background: activeCategory==='all'?'#1677ff':'#fff', 
          color:activeCategory==='all'?'#fff':'#333',
          fontSize: 14,
          fontWeight: activeCategory==='all' ? 600 : 400,
          whiteSpace: 'nowrap'
        }}
      >
        Barchasi
      </button>
      {categories.map(c=> (
        <button 
          key={c._id} 
          onClick={()=>onCategoryChange(c._id)} 
          style={{ 
            padding:'8px 12px', 
            borderRadius:20, 
            border:'1px solid #ddd', 
            background: activeCategory===c._id?'#1677ff':'#fff', 
            color:activeCategory===c._id?'#fff':'#333',
            fontSize: 14,
            fontWeight: activeCategory===c._id ? 600 : 400,
            whiteSpace: 'nowrap'
          }}
        >
          {c.name}
        </button>
      ))}
    </div>
  );
}
