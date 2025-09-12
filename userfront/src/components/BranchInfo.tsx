import React from 'react';
import { Branch } from '../types';

interface BranchInfoProps {
  branch: string;
  branches: Branch[];
}

export default function BranchInfo({ branch, branches }: BranchInfoProps) {
  if (!branch || branches.length === 0) return null;

  const currentBranch = branches.find(b => b._id === branch);
  const branchName = currentBranch?.name || currentBranch?.title;

  if (!branchName) return null;

  return (
    <div style={{ 
      marginBottom: 12, 
      padding: 8, 
      backgroundColor: '#f0f8ff', 
      borderRadius: 8, 
      fontSize: 14 
    }}>
      🏪 <strong>{branchName}</strong>
    </div>
  );
}
