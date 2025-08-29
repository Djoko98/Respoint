import React, { useContext, useState } from 'react';
import { UserContext } from '../../context/UserContext';
import { storageService } from '../../services/storageService';
import { authService } from '../../services/authService';

const LogoTest: React.FC = () => {
  const { user, setUser } = useContext(UserContext);
  const [testFile, setTestFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setTestFile(file);
      console.log('📁 Test file selected:', file.name, file.size, file.type);
    }
  };

  const testUpload = async () => {
    if (!testFile || !user?.id) {
      console.error('❌ No file selected or user not logged in');
      return;
    }

    setIsUploading(true);
    console.log('🚀 Starting logo upload test...');

    try {
      // Step 1: Upload to storage
      console.log('⬆️ Step 1: Uploading to Supabase Storage...');
      const logoUrl = await storageService.uploadLogo(user.id, testFile);
      
      if (!logoUrl) {
        console.error('❌ Upload failed - no URL returned');
        return;
      }
      
      console.log('✅ Step 1 complete: Logo uploaded to', logoUrl);

      // Step 2: Save to database
      console.log('💾 Step 2: Saving URL to database...');
      const result = await authService.updateProfile(user.id, {
        logo: logoUrl
      });

      if (result.success) {
        console.log('✅ Step 2 complete: Logo URL saved to database');
        
        // Step 3: Update user context
        console.log('🔄 Step 3: Updating user context...');
        const updatedUser = {
          ...user,
          logo: logoUrl
        };
        setUser(updatedUser);
        console.log('✅ Step 3 complete: User context updated');
        
        console.log('🎉 ALL TESTS PASSED! Logo persistence working correctly');
      } else {
        console.error('❌ Step 2 failed:', result.error);
      }
    } catch (error) {
      console.error('❌ Test failed with error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const testDelete = async () => {
    if (!user?.logo) {
      console.error('❌ No logo to delete');
      return;
    }

    console.log('🗑️ Starting logo delete test...');

    try {
      // Step 1: Delete from storage
      console.log('🗑️ Step 1: Deleting from Supabase Storage...');
      const deleteSuccess = await storageService.deleteLogo(user.logo);
      
      if (!deleteSuccess) {
        console.error('❌ Delete from storage failed');
        return;
      }
      
      console.log('✅ Step 1 complete: Logo deleted from storage');

      // Step 2: Update database
      console.log('💾 Step 2: Removing URL from database...');
      const result = await authService.updateProfile(user.id, {
        logo: ''
      });

      if (result.success) {
        console.log('✅ Step 2 complete: Logo URL removed from database');
        
        // Step 3: Update user context
        console.log('🔄 Step 3: Updating user context...');
        const updatedUser = {
          ...user,
          logo: ''
        };
        setUser(updatedUser);
        console.log('✅ Step 3 complete: User context updated');
        
        console.log('🎉 DELETE TEST PASSED! Logo removal working correctly');
      } else {
        console.error('❌ Step 2 failed:', result.error);
      }
    } catch (error) {
      console.error('❌ Delete test failed with error:', error);
    }
  };

  if (!user) {
    return (
      <div className="p-4 bg-red-100 border border-red-400 rounded">
        <p className="text-red-700">User not logged in - cannot test logo functionality</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-100 border border-gray-300 rounded-lg max-w-md">
      <h3 className="text-lg font-bold mb-4 text-gray-800">Logo Persistence Test</h3>
      
      <div className="space-y-4">
        {/* Current logo status */}
        <div className="p-3 bg-white rounded border">
          <h4 className="font-semibold text-gray-700 mb-2">Current Logo Status:</h4>
          {user.logo ? (
            <div>
              <img src={user.logo} alt="Current logo" className="w-16 h-16 object-cover rounded mb-2" />
              <p className="text-sm text-green-600">✅ Logo URL: {user.logo}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">❌ No logo set</p>
          )}
        </div>

        {/* File selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select test image:
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {testFile && (
            <p className="text-xs text-gray-600 mt-1">Selected: {testFile.name}</p>
          )}
        </div>

        {/* Test buttons */}
        <div className="flex gap-2">
          <button
            onClick={testUpload}
            disabled={!testFile || isUploading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isUploading ? 'Testing...' : 'Test Upload'}
          </button>
          
          <button
            onClick={testDelete}
            disabled={!user.logo || isUploading}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            Test Delete
          </button>
        </div>

        <div className="text-xs text-gray-500">
          <p>💡 Open browser console to see detailed test logs</p>
          <p>User ID: {user.id}</p>
        </div>
      </div>
    </div>
  );
};

export default LogoTest; 