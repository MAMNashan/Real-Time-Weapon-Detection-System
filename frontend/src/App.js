import React ,{useState} from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

// Components
import Navbar from './components/Navbar';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ImageDetection from './pages/ImageDetection';
import VideoDetection from './pages/VideoDetection';
import { useSocket } from './services/useSocket';

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
     
  return (
    <Router>
      <div className="min-h-screen bg-gray-100 ">
        <Navbar isLoggedin={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
        <main className='pt-14'>
          <Routes>
            <Route path="/" element={<Home isLoggedin={isLoggedIn} setIsLoggedIn={setIsLoggedIn}/>} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/image-detection" element={<ImageDetection />} />
            <Route path="/video-detection" element={<VideoDetection />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
