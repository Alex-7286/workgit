const { useEffect, useMemo, useState } = React;

const API_ROOMS = '/api/rooms';
const API_AUTH = '/api/auth';
const API_BOOKINGS = '/api/bookings';
const API_REVIEWS = '/api/reviews';
const API_ACTIVITIES = '/api/activities';
const API_COUPONS = '/api/coupons';

const initialStore = {
  rooms: [],
  bookings: [],
  reviews: [],
  activities: []
};

const storeReducer = (state = initialStore, action) => {
  switch (action.type) {
    case 'SET_ROOMS':
      return { ...state, rooms: action.payload };
    case 'SET_BOOKINGS':
      return { ...state, bookings: action.payload };
    case 'SET_REVIEWS':
      return { ...state, reviews: action.payload };
    case 'SET_ACTIVITIES':
      return { ...state, activities: action.payload };
    default:
      return state;
  }
};

const store = Redux.createStore(storeReducer);

const emptyRoomForm = {
  name: '',
  location: '',
  region: '',
  pricePerNight: '',
  maxGuests: '',
  images: '',
  description: '',
  amenities: '',
  latitude: '',
  longitude: '',
  rating: '',
  available: true
};

const emptyAuthForm = { name: '', email: '', password: '', role: 'user' };
const emptyLoginForm = { email: '', password: '' };
const emptyBookingForm = { roomId: '', roomType: 'twin', checkIn:  '', checkOut: '', guests: 1 };

const viewConfig = {
  home: { title: 'Stayfolio' },
  stays: { title: 'Stayfolio Stays' },
  stay: { title: 'Stayfolio Stay' },
  reserve: { title: 'Stayfolio Reserve' },
  payment: { title: 'Stayfolio Payment' },
  rooms: { title: 'Stayfolio Rooms' },
  bookings: { title: 'Stayfolio Bookings' },
  mypage: { title: 'Stayfolio My Page' },
  auth: { title: 'Stayfolio Account' },
  admin: { title: 'Stayfolio Admin' }
};

const pageMeta = {
  home: {
    label: 'Collection',
    headline: 'Discover today\'s featured stays and limited deals.',
    subtext: 'From nearby getaways to curated stays, book in minutes.'
  },
  stays: {
    label: 'Stays',
    headline: 'Find stays by region and price with smart filters.',
    subtext: 'Compare, shortlist, and book the best rates fast.'
  },
  stay: {
    label: 'Stay',
    headline: 'See full stay details before you book.',
    subtext: 'Choose a room type, confirm dates, and proceed.'
  },
  reserve: {
    label: 'Reserve',
    headline: 'Review your reservation and complete payment.',
    subtext: 'Confirm dates and guests, then finish booking.'
  },
  rooms: {
    label: 'Rooms',
    headline: 'Create and manage your stay listings.',
    subtext: 'Update images, prices, and amenities easily.'
  },
  bookings: {
    label: 'Bookings',
    headline: 'Manage all bookings in one place.',
    subtext: 'Track confirmed and cancelled stays quickly.'
  },
  mypage: {
    label: 'My page',
    headline: 'View and manage your reservations.',
    subtext: 'Your upcoming and past stays at a glance.'
  },
  auth: {
    label: 'Account',
    headline: 'Sign up or log in to get started.',
    subtext: 'Create an account and start booking right away.'
  },
  admin: {
    label: 'Admin',
    headline: 'Manage coupons and promotions.',
    subtext: 'Create and monitor discount codes.'
  }
};

const resolveView = (pathname) => {
  const path = pathname.toLowerCase();
  if (path === '/' || path.endsWith('/index.html')) return 'home';
  if (path.includes('stays')) return 'stays';
  if (path.includes('stay')) return 'stay';
  if (path.includes('reserve')) return 'reserve';
  if (path.includes('rooms')) return 'rooms';
  if (path.includes('bookings')) return 'bookings';
  if (path.includes('mypage')) return 'mypage';
  if (path.includes('payment')) return 'payment';
  if (path.includes('auth')) return 'auth';
  if (path.includes('admin')) return 'admin';
  return 'home';
};

const safeJson = async (response) => {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (error) {
    return { message: 'Unexpected response from server' };
  }
};

const formatKstDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

const getActivityLabel = (activity) => {
  switch (activity?.type) {
    case 'booking_created':
      return 'Booking confirmed';
    case 'booking_cancelled':
      return 'Booking cancelled';
    case 'review_created':
      return 'Review posted';
    default:
      return activity?.message || 'Activity';
  }
};
const geocodeAddress = (geocoder, address) =>
  new Promise((resolve, reject) => {
    geocoder.addressSearch(address, (result, status) => {
      if (status !== window.kakao.maps.services.Status.OK || !result[0]) {
        reject(new Error('Address lookup failed'));
        return;
      }
      resolve({
        lat: Number(result[0].y),
        lng: Number(result[0].x)
      });
    });
  });

function normalizeRoomPayload(form){
  return { 
    name: form.name.trim(),
    location: form.location.trim(),
    pricePerNight: Number(form.pricePerNight),
    maxGuests: Number(form.maxGuests),
    images: form.images
      .split('.')
      .map((item) => item.trim())
      .filter(Boolean),
    description: form.description.trim(),
    amenities: form.amenities
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
    rating: form.rating === '' ? 0 : Number(form.rating),
    available: Boolean(form.available)
  }
}

function App() { 
  const dispatch = ReactRedux.useDispatch();
  const rooms = ReactRedux.useSelector((state) => state.rooms);
  const bookings = ReactRedux.useSelector((state) => state.bookings);
  const reviews = ReactRedux.useSelector((state) => state.reviews);
  const activities = ReactRedux.useSelector((state) => state.activities);
  const [roomForm, setRoomForm] = useState(emptyRoomForm);
  const [reviewForm, setReviewForm] = useState({ rating: '5', comment: '' });
  const [reviewFiles, setReviewFiles] = useState([]);
  const [reviewForms, setReviewForms] = useState({});
  const [roomFiles, setRoomFiles] = useState([]);
  const [authForm, setAuthForm] = useState(emptyAuthForm);
  const [loginForm, setLoginForm] = useState(emptyLoginForm);
  const [bookingForm, setBookingForm] = useState(emptyBookingForm);
  const [editingRoomId, setEditingRoomId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [view, setView] = useState(() => resolveView(window.location.pathname));
  const [slideIndex, setSlideIndex] = useState(0);
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const [priceSort, setPriceSort] = useState('low');
  const [bookedRanges, setBookedRanges] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [modalFilters, setModalFilters] = useState({
    region: 'all',
    checkIn: '',
    checkOut: '',
    guests: '1'
  });
  const [blockedRoomIds, setBlockedRoomIds] = useState([]);
  const [stayFilters, setStayFilters] = useState({
    region: 'all',
    checkIn: '',
    checkOut: '',
    guests: '1'
  });
  const [bookingSuccessOpen, setBookingSuccessOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState('');
  const [staySlideIndex, setStaySlideIndex] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('kakaopay');
  const [couponCode, setCouponCode] = useState('');
  const [couponInfo, setCouponInfo] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [coupons, setCoupons] = useState([]);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: '',
    type: 'percent',
    amount: '',
    maxUses: '',
    expiresAt: '',
    roomId: ''
  });
  const [inquiryText, setInquiryText] = useState('');
  const [inquiryReply, setInquiryReply] = useState('');
  const [reserveMapOpen, setReserveMapOpen] = useState(false);
  const bookingSectionRef = React.useRef(null);
  // stay map refs removed
  const reserveMapRef = React.useRef(null);
  const reserveMapInstanceRef = React.useRef(null);
  const reserveMapMarkerRef = React.useRef(null);
  const existingImageList = useMemo(() => {
    if (!roomForm.images) return [];
    return String(roomForm.images)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }, [roomForm.images]);
  // const uploadPreviews = useMemo(
  //   () => roomFiles.map((file) => ({ file, url: URL.createObjectURL(file) })),
  //   [roomFiles]
  // );

  const uploadPreviews = useMemo(
    () => roomFiles.map((file) => ({file, url: URL.createObjectURL(file)})),
    [roomFiles]
  );


  const reviewPreviews = useMemo(
    () => reviewFiles.map((file) => URL.createObjectURL(file)),
    [reviewFiles]
  );

  useEffect(() => {
    return () => {
      uploadPreviews.forEach((item) => URL.revokeObjectURL(item.url));
    }
  },[uploadPreviews]);

  useEffect(() => {
    return () => {
      reviewPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [reviewPreviews]);

  useEffect(() => {
    const cls = 'theme-dark';
    if (isDark) {
      document.body.classList.add(cls);
    } else {
      document.body.classList.remove(cls);
    }
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);
  const authHeaders = useMemo(() => {
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  }, [token]);
  const params = new URLSearchParams(window.location.search);
  const stayId = params.get('id');
  const reserveType = params.get('roomType');

  const fetchRooms = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(API_ROOMS);
      if (!response.ok) {
        throw new Error('Failed to load rooms');
      }
      const data = await response.json();
      dispatch({ type: 'SET_ROOMS', payload: data });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMe = async () => {
    if (!token) {
      setUser(null);
      return;
    }

    try {
      const response = await fetch(`${API_AUTH}/me`, { headers: authHeaders });
      if (!response.ok) {
        setUser(null);
        return;
      }
      const data = await response.json();
      setUser(data);
      if (data?.role === 'admin') {
        fetchCoupons();
      }
    } catch (err) {
      setUser(null);
    }
  };

  const fetchBookings = async () => {
    if (!token) {
      dispatch({ type: 'SET_BOOKINGS', payload: [] });
      return;
    }

    try {
      const response = await fetch(API_BOOKINGS, { headers: authHeaders });
      if (!response.ok) {
        throw new Error('Failed to load bookings');
      }
      const data = await response.json();
      dispatch({ type: 'SET_BOOKINGS', payload: data.filter((booking) => booking.status === 'confirmed') });
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchActivities = async () => {
    if (!token) {
      dispatch({ type: 'SET_ACTIVITIES', payload: [] });
      return;
    }

    try {
      const response = await fetch(API_ACTIVITIES, { headers: authHeaders });
      if (!response.ok) {
        throw new Error('Failed to load activities');
      }
      const data = await response.json();
      dispatch({ type: 'SET_ACTIVITIES', payload: Array.isArray(data) ? data : [] });
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    const newView = resolveView(window.location.pathname);
    setView(newView);
    document.title = viewConfig[newView]?.title || 'Stayfolio';
  }, []);

  useEffect(() => {
    if (view === 'stays') {
      const searchParams = new URLSearchParams(window.location.search);
      setStayFilters({
        region: searchParams.get('region') || 'all',
        checkIn: searchParams.get('checkIn') || '',
        checkOut: searchParams.get('checkOut') || '',
        guests: searchParams.get('guests') || '1'
      });
    }
    if (view === 'payment') {
      const searchParams = new URLSearchParams(window.location.search);
      const bookingId = searchParams.get('bookingId');
      const status = searchParams.get('status');
      const pgToken = searchParams.get('pg_token');

      if (status === 'cancel') {
        fetch(`/api/payments/cancel?bookingId=${bookingId || ''}`);
        return;
      }
      if (status === 'fail') {
        fetch(`/api/payments/fail?bookingId=${bookingId || ''}`);
        return;
      }
      if (!bookingId || !pgToken) {
        setError('Missing payment information.');
        return;
      }

      fetch(`/api/payments/approve?bookingId=${bookingId}&pg_token=${pgToken}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.message !== 'Payment approved') {
            setError(data.message || 'Payment approval failed.');
          } else {
            fetchBookings();
            fetchActivities();
        window.alert('Action completed.');
            window.location.href = '/index.html';
          }
        })
        .catch((err) => setError(err.message));
    }
  }, [view]);

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    fetchMe();
    fetchBookings();
    fetchActivities();
  }, [token]);

  useEffect(() => {
    if (view === 'admin') {
      fetchCoupons();
    }
  }, [token, view]);

  useEffect(() => {
    if (!stayId) return;
    setBookingForm((prev) =>
      prev.roomId === stayId ? prev : { ...prev, roomId: stayId }
    );
  }, [stayId]);

  useEffect(() => {
    if (!stayId) {
      dispatch({ type: 'SET_REVIEWS', payload: [] });
      return;
    }

    fetch(`${API_REVIEWS}?roomId=${stayId}`)
      .then((res) => res.json())
      .then((data) => {
        dispatch({ type: 'SET_REVIEWS', payload: Array.isArray(data) ? data : [] });
      })
      .catch(() => dispatch({ type: 'SET_REVIEWS', payload: [] }));
  }, [stayId]);

  useEffect(() => {
    if (!activeStay) return;
    setBookingForm((prev) =>
      prev.roomId === activeStay._id ? prev : { ...prev, roomId: activeStay._id }
    );
    setStaySlideIndex(0);
  }, [activeStay]);

  useEffect(() => {
    if (view !== 'reserve') return;
    if (!stayId) return;
    setBookingForm((prev) => ({
      ...prev,
      roomId: stayId,
      roomType: reserveType === 'premium' ? 'premium' : 'twin'
    }));
  }, [view, stayId, reserveType]);

  useEffect(() => {
    if (view !== 'reserve') return;
    const images = activeStay?.images || [];
    if (!images.length) return;
    const preferredIndex = bookingForm.roomType === 'premium' && images.length > 1 ? 1 : 0;
    setStaySlideIndex((prev) => (prev === preferredIndex ? prev : preferredIndex));
  }, [view, bookingForm.roomType, activeStay?.images?.length]);

  // room map removed

  // stays map removed

  useEffect(() => {
    if (!['reserve', 'stay'].includes(view)) return;
    if (!reserveMapOpen) return;
    if (!reserveMapRef.current || !activeStay) return;
    if (!window.kakao || !window.kakao.maps) {
      console.warn('Kakao Maps SDK not loaded.');
      return;
    }

    if (!reserveMapInstanceRef.current) {
      reserveMapInstanceRef.current = new window.kakao.maps.Map(reserveMapRef.current, {
        center: new window.kakao.maps.LatLng(37.5665, 126.978),
        level: 5
      });
      reserveMapMarkerRef.current = new window.kakao.maps.Marker({
        map: reserveMapInstanceRef.current
      });
    }

    const map = reserveMapInstanceRef.current;
    const marker = reserveMapMarkerRef.current;
    if (!map || !marker) return;

    setTimeout(() => {
      map.relayout();
    }, 0);

    if (!activeStay.location) {
      setError('Something went wrong.');
      return;
    }
    const geocoder = new window.kakao.maps.services.Geocoder();
    geocoder.addressSearch(activeStay.location, (result, status) => {
      if (status !== window.kakao.maps.services.Status.OK || !result[0]) {
      setError('Something went wrong.');
        return;
      }
      const position = new window.kakao.maps.LatLng(result[0].y, result[0].x);
      marker.setPosition(position);
      map.setCenter(position);
    });
  }, [view, reserveMapOpen, activeStay]);

  useEffect(() => {
    if (!reserveMapOpen) {
      reserveMapInstanceRef.current = null;
      reserveMapMarkerRef.current = null;
    }
  }, [reserveMapOpen]);

  useEffect(() => {
    if (!bookingForm.roomId) {
      setBookedRanges([]);
      return;
    }

    const fetchAvailability = async () => {
      try {
        const response = await fetch(
          `${API_BOOKINGS}/room/${bookingForm.roomId}?roomType=${bookingForm.roomType}`
        );
        if (!response.ok) {
          throw new Error('Failed to load availability');
        }
        const data = await response.json();
        setBookedRanges(data);
      } catch (err) {
        setBookedRanges([]);
      }
    };

    fetchAvailability();
  }, [bookingForm.roomId, bookingForm.roomType]);

  useEffect(() => {
    if (!stayFilters.checkIn || !stayFilters.checkOut) {
      setBlockedRoomIds([]);
      return;
    }

    const fetchBlocked = async () => {
      try {
        const response = await fetch(
          `${API_BOOKINGS}/availability?checkIn=${stayFilters.checkIn}&checkOut=${stayFilters.checkOut}`
        );
        if (!response.ok) {
          throw new Error('Failed to load availability');
        }
        const data = await response.json();
        setBlockedRoomIds(Array.isArray(data.roomIds) ? data.roomIds : []);
      } catch (err) {
        setBlockedRoomIds([]);
      }
    };

    fetchBlocked();
  }, [stayFilters.checkIn, stayFilters.checkOut]);

  // const handleRoomChange = (event) => {
  //   const { name, value, type, checked } = event.target;
  //   setRoomForm((prev) => ({
  //     ...prev,
  //     [name]: type === 'checkbox' ? checked : value
  //   }));
  // }; 

  const handleRoomChange = (event) => {
    const {name, value, type, checked} = event.target;
    setRoomForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleRoomFilesChange = (event) => {
    const files = Array.from(event.target.files || []);
    setRoomFiles(files);
  };

  const handleOpenPostcode = () => {
    if (!window.daum || !window.daum.Postcode) {
        window.alert('Action completed.');
      return;
    }

    new window.daum.Postcode({
      oncomplete: (data) => {
        const address = data.roadAddress || data.address || '';
        setRoomForm((prev) => ({ ...prev, location: address }));
      }
    }).open();
  };

  // const handleRemoveExistingImage = (index) => {
  //   setRoomForm((prev) => {
  //     const items = String(prev.images || '')
  //       .split(',')
  //       .map((item) => item.trim())
  //       .filter(Boolean);
  //     const nextItems = items.filter((_, idx) => idx !== index);
  //     return { ...prev, images: nextItems.join(', ') };
  //   });
  // };

  const handleRemoveExistingImage = (index) => {
    setRoomForm( (prev) => {
      const items = String(prev.images || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      const nextItems = items.filter((_, idx) => idx !== index);
      return{...prev, images: nextItems.join(', ')};
    })
  }

  const handleRemoveUploadImage = (index) => {
    setRoomFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleReviewChange = (event) => {
    const { name, value } = event.target;
    setReviewForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleReviewSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!stayId) {
      setError('Missing room id');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('roomId', stayId);
      formData.append('rating', Number(reviewForm.rating));
      formData.append('comment', reviewForm.comment);
      reviewFiles.forEach((file) => formData.append('images', file));

      const response = await fetch(API_REVIEWS, {
        method: 'POST',
        headers: {
          ...authHeaders
        },
        body: formData
      });

      const data = await safeJson(response);
      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit review');
      }

      setReviewForm({ rating: '5', comment: '' });
      setReviewFiles([]);
      await fetchRooms();
      const updated = await fetch(`${API_REVIEWS}?roomId=${stayId}`);
      const list = await updated.json();
      dispatch({ type: 'SET_REVIEWS', payload: Array.isArray(list) ? list : [] });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleBookingReviewChange = (bookingId, field, value) => {
    setReviewForms((prev) => ({
      ...prev,
      [bookingId]: {
        rating: '5',
        comment: '',
        files: [],
        open: prev[bookingId]?.open || false,
        ...prev[bookingId],
        [field]: value
      }
    }));
  };

  const handleBookingReviewFilesChange = (bookingId, files) => {
    setReviewForms((prev) => {
      const current = prev[bookingId] || {};
      const prevPreviews = current.previews || [];
      prevPreviews.forEach((url) => URL.revokeObjectURL(url));
      const nextPreviews = files.map((file) => URL.createObjectURL(file));
      return {
        ...prev,
        [bookingId]: {
          rating: '5',
          comment: '',
          files: [],
          open: current.open || false,
          ...current,
          files,
          previews: nextPreviews
        }
      };
    });
  };

  const handleRemoveBookingReviewFile = (bookingId, index) => {
    setReviewForms((prev) => {
      const current = prev[bookingId] || {};
      const files = current.files || [];
      const previews = current.previews || [];
      const nextFiles = files.filter((_, idx) => idx !== index);
      const nextPreviews = previews.filter((_, idx) => idx !== index);
      const removedUrl = previews[index];
      if (removedUrl) {
        URL.revokeObjectURL(removedUrl);
      }
      return {
        ...prev,
        [bookingId]: {
          rating: '5',
          comment: '',
          files: [],
          open: current.open || false,
          ...current,
          files: nextFiles,
          previews: nextPreviews
        }
      };
    });
  };

  const handleInquirySubmit = (event) => {
    event.preventDefault();
    const trimmed = inquiryText.trim();
    if (!trimmed) {
      setInquiryReply('관련 답변을 찾지 못했어요.');
      return;
    }
    setInquiryReply(getFaqAnswer(trimmed));
  };

  const handleToggleBookingReview = (bookingId) => {
    setReviewForms((prev) => ({
      ...prev,
      [bookingId]: {
        rating: '5',
        comment: '',
        ...prev[bookingId],
        open: !prev[bookingId]?.open
      }
    }));
  };

  const handleBookingReviewSubmit = async (event, booking) => {
    event.preventDefault();
    setError('');

    if (!booking?.room?._id) {
      setError('Missing room id');
      return;
    }

    const form = reviewForms[booking._id] || { rating: '5', comment: '', files: [] };

    try {
      const formData = new FormData();
      formData.append('roomId', booking.room._id);
      formData.append('rating', Number(form.rating));
      formData.append('comment', form.comment);
      (form.files || []).forEach((file) => formData.append('images', file));

      const response = await fetch(API_REVIEWS, {
        method: 'POST',
        headers: {
          ...authHeaders
        },
        body: formData
      });

      const data = await safeJson(response);
      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit review');
      }

      setReviewForms((prev) => ({ ...prev, [booking._id]: { rating: '5', comment: '', files: [], open: false } }));
      await fetchRooms();
      await fetchBookings();
      await fetchActivities();
        window.alert('Action completed.');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleOpenDirections = async () => {
    if (!activeStay || !activeStay.location) {
      setError('Something went wrong.');
      return;
    }
    if (!window.kakao || !window.kakao.maps) {
      setError('Something went wrong.');
      return;
    }

    try {
      const geocoder = new window.kakao.maps.services.Geocoder();
      const dest = await geocodeAddress(geocoder, activeStay.location);
      const destName = encodeURIComponent(activeStay.name || '');
      const url = `https://map.kakao.com/link/to/${destName},${dest.lat},${dest.lng}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError('Something went wrong.');
    }
  };


  const handleAuthChange = (event) => {
    const { name, value } = event.target;
    setAuthForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLoginChange = (event) => {
    const { name, value } = event.target;
    setLoginForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleBookingChange = (event) => {
    const {name, value} = event.target;
    setBookingForm( (prev) => {
      const next = {...prev, [name]: value};
      if(name === 'checkOut' && next.checkIn && value && hasDateOverlap(next.checkIn, value)){
        window.alert('예약이 완료되었습니다.');
        return{...next, checkOut: ''}
      }
      return next;
    })
  }
  
  const handleSearchChange = (event) => {
    const {name, value} = event.target;
    setModalFilters((prev) => ({...prev, [name]: value}))
  }

  const handleStayFilterChange = (event) => {
    const { name, value } = event.target;
    setStayFilters((prev) => ({ ...prev, [name]: value }));
  };

  const hasDateOverlap = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return false;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    return bookedRanges.some((range) => {
      const rangeStart = new Date(range.checkIn);
      const rangeEnd = new Date(range.checkOut);
      return rangeStart < end && rangeEnd > start;
    });
  };

  // const handleRoomSubmit = async (event) => {
  //   event.preventDefault();
  //   setError('');

  //   const payload = normalizeRoomPayload(roomForm);
  //   const isEditing = Boolean(editingRoomId);
  //   const url = isEditing ? `${API_ROOMS}/${editingRoomId}` : API_ROOMS;
  //   const method = isEditing ? 'PUT' : 'POST';

  //   try {
  //     const response = await fetch(url, {
  //       method,
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify(payload)
  //     });

  //     if (!response.ok) {
  //       const data = await safeJson(response);
  //       throw new Error(data.message || 'Failed to save room');
  //     }

  //     setRoomForm(emptyRoomForm);
  //     setEditingRoomId(null);
  //     await fetchRooms();
  //   } catch (err) {
  //     setError(err.message);
  //   }
  // };

  const handleRoomSubmit  = async (event) =>{
      event.preventDefault();
      setError('');

      const isEditing = Boolean(editingRoomId);
      const url = isEditing ? `${API_ROOMS}/${editingRoomId}` : API_ROOMS;
      const method = isEditing ? 'PUT' : 'POST';

      try{
        const formData = new FormData();
        formData.append('name', roomForm.name);
        formData.append('location', roomForm.location);
        formData.append('region', roomForm.region);
        formData.append('pricePerNight', roomForm.pricePerNight);
        formData.append('maxGuests', roomForm.maxGuests);
        formData.append('rating', roomForm.rating);
        formData.append('available', roomForm.available);
        formData.append('amenities', roomForm.amenities);
        formData.append('description', roomForm.description);
        formData.append('latitude', roomForm.latitude);
        formData.append('longitude', roomForm.longitude);
        formData.append('existingImages', roomForm.images);
        roomFiles.forEach((file) => formData.append('images', file));

        const response = await fetch(url, {
            method,
            body: formData
        });

        if(!response.ok){
          const data = await safeJson(response);
          throw new Error(data.message || 'Failed to save room');
        }

        setRoomForm(emptyRoomForm);
        setRoomFiles([]);
        setEditingRoomId(null);
        await fetchRooms();
      }catch(err){
        setError(err.message);
      }
  }

  const handleRegister = async (event) => {
    event.preventDefault();
    setError('');

    try {
      const response = await fetch(`${API_AUTH}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });

      const data = await safeJson(response);
      if (!response.ok) {
        throw new Error(data.message || 'Failed to register');
      }

      setToken(data.token);
      localStorage.setItem('token', data.token);
      setAuthForm(emptyAuthForm);
    } catch (err) {
      setError(err.message);
    }
  };

  // const handleLogin = async (event) => {
  //   event.preventDefault();
  //   setError('');

  //   try {
  //     const response = await fetch(`${API_AUTH}/login`, {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify(loginForm)
  //     });

  //     const data = await safeJson(response);
  //     if (!response.ok) {
  //       throw new Error(data.message || 'Failed to login');
  //     }

  //     setToken(data.token);
  //     localStorage.setItem('token', data.token);
  //     setLoginForm(emptyLoginForm);
  //   } catch (err) {
  //     setError(err.message);
  //   }
  // };


  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');

    try{
      const response = await fetch(`${API_AUTH}/login`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(loginForm)
      });

      const data = await safeJson(response);
      if(!response.ok){
        throw new Error(data.message || 'Failed to login');
      }

      setToken(data.token);
      localStorage.setItem('token', data.token);
      setLoginForm(emptyLoginForm);
    }catch(err){
      setError(err.message);
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setToken(null);
    dispatch({ type: 'SET_BOOKINGS', payload: [] });
  }

  const handleRoomEdit = (room) => {
    setEditingRoomId(room._id);
    setRoomForm({
      name: room.name || '',
      location: room.location || '',
      region: room.region || '',
      pricePerNight: room.pricePerNight ?? '',
      maxGuests: room.maxGuests ?? '',
      images: Array.isArray(room.images) ? room.images.join(', ') : '',
      description: room.description || '',
      latitude: room.latitude ?? '',
      longitude: room.longitude ?? '',
      amenities: Array.isArray(room.amenities) ? room.amenities.join(', ') : '',
      // amenities: Array.isArray(room.amenities) ? room.amenities.join(', ') : '',
      rating: room.rating ?? '',
      available: Boolean(room.available)
    });
    setRoomFiles([]);
  };

  const handleRoomCancel = () => {
    setEditingRoomId(null);
    setRoomForm(emptyRoomForm);
    setRoomFiles([]);
  };

  const handleRoomDelete = async (roomId) => {
    if (!window.confirm('Delete this room?')) {
      return;
    }

    try {
      const response = await fetch(`${API_ROOMS}/${roomId}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Failed to delete room');
      }
      await fetchRooms();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleBookingSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const bookingRoomId = bookingForm.roomId || activeStay?._id;
    if (!bookingRoomId || !bookingForm.roomType || !bookingForm.checkIn || !bookingForm.checkOut || !bookingForm.guests) {
      setError('Missing booking data');
      return;
    }

    if (hasDateOverlap(bookingForm.checkIn, bookingForm.checkOut)) {
      setError('Selected dates are not available');
        window.alert('Action completed.');
      return;
    }

    try {
      if (paymentMethod === 'card') {
        const response = await fetch(API_BOOKINGS, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders
          },
          body: JSON.stringify({
            roomId: bookingRoomId,
            roomType: bookingForm.roomType,
            checkIn: bookingForm.checkIn,
            checkOut: bookingForm.checkOut,
            guests: Number(bookingForm.guests),
            couponCode: couponInfo?.code || ''
          })
        });

        const data = await safeJson(response);
        if (!response.ok) {
          throw new Error(data.message || 'Failed to book');
        }

        setBookingForm(emptyBookingForm);
        await fetchBookings();
        await fetchActivities();
        window.alert('예약이 완료되었습니다!!');
        window.location.href = '/index.html';
        return;
      }

      const response = await fetch('/api/payments/ready', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
      body: JSON.stringify({
        roomId: bookingRoomId,
        roomType: bookingForm.roomType,
        checkIn: bookingForm.checkIn,
        checkOut: bookingForm.checkOut,
        guests: Number(bookingForm.guests),
        couponCode: couponInfo?.code || ''
      })
    });

      const data = await safeJson(response);
      if (!response.ok) {
        throw new Error(data.message || 'Failed to start payment');
      }

      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }

      setError('Payment redirect missing.');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    try {
      const response = await fetch(`${API_BOOKINGS}/${bookingId}/cancel`, {
        method: 'PATCH',
        headers: authHeaders
      });

      if (!response.ok) {
        throw new Error('Failed to cancel booking');
      }

      await fetchBookings();
      await fetchActivities();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  const handleApplyCoupon = async () => {
    const code = couponCode.trim();
    if (!code) {
      setCouponError('쿠폰 코드를 입력하세요.');
      setCouponInfo(null);
      return;
    }
    try {
      const bookingRoomId = bookingForm.roomId || activeStay?._id || '';
      const response = await fetch(`${API_COUPONS}/validate?code=${encodeURIComponent(code)}&roomId=${encodeURIComponent(bookingRoomId)}`);
      const data = await safeJson(response);
      if (!response.ok) {
        throw new Error(data.message || 'Invalid coupon');
      }
      setCouponInfo(data);
      setCouponError('');
    } catch (err) {
      setCouponInfo(null);
      setCouponError(err.message);
    }
  };

  const handleCouponChange = (event) => {
    const { name, value } = event.target;
    setCouponForm((prev) => ({...prev, [name]: value})); 
  }

  const fetchCoupons = async () => {
    if(!token) return;
    try {
      setCouponLoading(true);
      const response = await fetch(API_COUPONS, { headers: authHeaders });
      const data = await safeJson(response);
      if (!response.ok) {
        throw new Error(data.message || 'Failed to load coupons');
      }
      setCoupons(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleCreateCoupon = async (event) => {
    event.preventDefault();
    if (!isAdmin) {
      setError('Not allowed');
      return;
    }
    try {
      const payload = {
        code: couponForm.code,
        type: couponForm.type,
        amount: Number(couponForm.amount || 0),
        maxUses: couponForm.maxUses === '' ? undefined : Number(couponForm.maxUses),
        expiresAt: couponForm.expiresAt || undefined,
        roomId: couponForm.roomId || undefined
      };
      const response = await fetch(API_COUPONS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify(payload)
      });
      const data = await safeJson(response);
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create coupon');
      }
      setCouponForm({ code: '', type: 'percent', amount: '', maxUses: '', expiresAt: '', roomId: '' });
      await fetchCoupons();
    } catch (err) {
      setError(err.message);
    }
  };

  const confirmCancelBooking = async () => {
    if(!cancelTargetId){
      setError('Missing booking id');
      return;
    }
    const ok = await handleCancelBooking(cancelTargetId);
    if(ok){
      setCancelTargetId('');
      setCancelConfirmOpen(false);
    }else{
      window.alert('취소가 완료되었습니다!!');
    }
  }

  const featuredRooms = [...rooms]
    .sort((a, b) => {
      const aScore = Number(a.ratingAverage || a.rating || 0);
      const bScore = Number(b.ratingAverage || b.rating || 0);
      return bScore - aScore;
    })
    .slice(0, 3);

  const recommendRooms  = [...rooms]
    .sort((a, b) => {
      const aScore = Number(a.ratingAverage || a.rating || 0);
      const bScore = Number(b.ratingAverage || b.rating || 0);
      return bScore - aScore;
    })
    .slice(0, 1);

  const isAdmin = user?.role === 'admin';
  const meta = pageMeta[view] || pageMeta.home;
  const regions = Array.from(
    new Set(rooms.map((room) => room.region || room.location).filter(Boolean))
  );

  const filteredStays = rooms.filter((room) =>
    stayFilters.region === 'all'
    ? true
    : (room.region || room.location) === stayFilters.region
  )


  const sortedStays = [...filteredStays].sort((a, b) => {
    if (priceSort === 'reviews') {
      const aReviews = Number(a.reviewCount || 0);
      const bReviews = Number(b.reviewCount || 0);
      const aRating = Number(a.ratingAverage || a.rating || 0);
      const bRating = Number(b.ratingAverage || b.rating || 0);
      const aKey = aReviews * 1000 + aRating;
      const bKey = bReviews * 1000 + bRating;
      return bKey - aKey;
    }
    const aPrice = Number(a.pricePerNight || 0);
    const bPrice = Number(b.pricePerNight || 0);
    return priceSort  === 'low' ? aPrice - bPrice : bPrice - aPrice;
  });
  const activeStay = stayId ? rooms.find((room) => room._id === stayId) : null; 
  const stayImages = activeStay?.images || [];
  const hasStayCarousel = stayImages.length > 1;
  const stayImage = stayImages.length
    ? stayImages[staySlideIndex % stayImages.length]
    : '';
  const twinImage = stayImages[0] || '';
  const premiumImage = stayImages[1] || stayImages[0] || '';
  const selectedRoomImage = hasStayCarousel
    ? stayImage
    : bookingForm.roomType === 'premium'
      ? premiumImage
      : twinImage;
  const basePrice = Number(activeStay?.pricePerNight || 0);
  const twinPrice = basePrice;
  const premiumPrice = Math.round(basePrice * 1.3);
  const today = new Date().toISOString().split('T')[0];
  const minCheckOut = bookingForm.checkIn
    ? new Date(new Date(bookingForm.checkIn).getTime() + 86400000).toISOString().split('T')[0]
    : '';
  const previewTotal = useMemo(() => {
    if (!activeStay || !bookingForm.checkIn || !bookingForm.checkOut) return 0;
    const start = new Date(bookingForm.checkIn);
    const end = new Date(bookingForm.checkOut);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return 0;
    const typeMultiplier = bookingForm.roomType === 'premium' ? 1.3 : 1;
    const guests = Math.max(1, Number(bookingForm.guests || 1));
    let total = 0;
    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
      const day = d.getDay();
      const weekendMultiplier = day === 0 || day === 6 ? 1.5 : 1;
      total += basePrice * typeMultiplier * weekendMultiplier;
    }
    return Math.round(total);
  }, [
    activeStay?._id,
    basePrice,
    bookingForm.checkIn,
    bookingForm.checkOut,
    bookingForm.guests,
    bookingForm.roomType
  ]);
  const previewDiscount = useMemo(() => {
    if (!couponInfo || previewTotal <= 0) return 0;
    const amount = Number(couponInfo.amount || 0);
    const discount =
      couponInfo.type === 'fixed'
        ? amount
        : Math.round((amount / 100) * previewTotal);
    return Math.min(previewTotal, Math.max(0, discount));
  }, [couponInfo, previewTotal]);
  const previewFinal = Math.max(0, previewTotal - previewDiscount);
  const availableStays = sortedStays
    .filter((room) => Number(room.maxGuests || 0) >= Number(stayFilters.guests || 1))
    .filter((room) => (blockedRoomIds.length ? !blockedRoomIds.includes(String(room._id)) : true));

  const faqItems = [
  {
    keywords: ['\uCCB4\uD06C\uC778', '\uC785\uC2E4', 'checkin'],
    answer: '\uCCB4\uD06C\uC778\uC740 \uBCF4\uD1B5 \uC624\uD6C4 3\uC2DC\uC785\uB2C8\uB2E4. \uC219\uC18C \uC0C1\uC138\uC5D0\uC11C \uC2DC\uAC04\uC744 \uD655\uC778\uD574\uC8FC\uC138\uC694.'
  },
  {
    keywords: ['\uCCB4\uD06C\uC544\uC6C3', '\uD1F4\uC2E4', 'checkout'],
    answer: '\uCCB4\uD06C\uC544\uC6C3\uC740 \uBCF4\uD1B5 \uC624\uC804 11\uC2DC\uC785\uB2C8\uB2E4. \uC219\uC18C\uBCC4 \uC815\uCC45\uC744 \uD655\uC778\uD574\uC8FC\uC138\uC694.'
  },
  {
    keywords: ['\uC608\uC57D', 'booking', '\uACB0\uC81C', 'payment'],
    answer: '\uC608\uC57D\uC740 \uC219\uC18C \uC0C1\uC138\uC5D0\uC11C \uB0A0\uC9DC\uC640 \uC778\uC6D0\uC744 \uC120\uD0DD\uD55C \uD6C4 \uACB0\uC81C\uD558\uBA74 \uC644\uB8CC\uB429\uB2C8\uB2E4.'
  },
  {
    keywords: ['\uCDE8\uC18C', '\uD658\uBD88', 'cancel', 'refund'],
    answer: '\uCDE8\uC18C/\uD658\uBD88 \uC815\uCC45\uC740 \uC219\uC18C\uBCC4\uB85C \uB2E4\uB985\uB2C8\uB2E4. \uB9C8\uC774\uD398\uC774\uC9C0 \uC608\uC57D \uB0B4\uC5ED\uC5D0\uC11C \uD655\uC778\uD558\uC138\uC694.'
  },
  {
    keywords: ['\uC704\uCE58', '\uC8FC\uC18C', 'location', 'map'],
    answer: '\uC219\uC18C \uC0C1\uC138\uC758 \u201C\uC704\uCE58 \uBCF4\uAE30\u201D \uBC84\uD2BC\uC744 \uB20C\uB7EC \uC9C0\uB3C4\uC5D0\uC11C \uD655\uC778\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.'
  }
];

  const normalizeText = (value) =>
    String(value || '')
      .toLowerCase()
      .replace(/\s+/g, '');

  // const getFaqAnswer = (text) => {
  //   const normalized = normalizeText(text);
  //   const match = faqItems.find((item) =>
  //     item.keywords.some((keyword) => normalized.includes(normalizeText(keyword)))
  //   );
  //   return match
  //     ? match.answer
  //     : 'No matching answer found.'
  // };

  const getFaqAnswer = (text) => {
    const normalized = normalizeText(text);
    const match = faqItems.find( (item) =>
      item.keywords.some((keyword) => normalized.includes(normalizeText(keyword)))
    );
    return match
    ? match.answer
    : '관련 답변을 찾지 못했어요.'
  }

  const todayDate = new Date();
  const isCompletedBooking = (booking) => {
    if (!booking) return false;
    return booking.status === 'confirmed';
  };
  const slides = [
    {
      headline: meta.headline,
      subtext: meta.subtext
    },
    {
      headline: '첫 예약 혜택 받기',
      subtext: '신규 고객 최대 4만원 혜택'
    },
    {
      headline: '리뷰 좋은 스테이 모음',
      subtext: '검증된 숙소만 소개합니다.'
    }
  ];
  const activeSlide = slides[slideIndex % slides.length];

  useEffect(() => {
    // if (view !== 'home') return;
    const timer = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % slides.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [view, slides.length]);

  return (
    <div className="page">
      <header className="site-header">
        <a className="logo-stack" href="/index.html">
          <span>STAY</span>
          <span>FOLIO</span>
        </a>
        <div className="header-search">
          <div className="pill-tabs">
            <button type="button" className="tab active" onClick={() => setIsDark(false)}>Light</button>
            <button type="button" className="tab" onClick={() => setIsDark(true)}>Dark</button>
          </div>
          <div className="search-bar">
            <span className="search-icon">O</span>
            <input
              type="text"
              placeholder="Search address"
              onFocus={() => setSearchOpen(true)}
              readOnly
            />
          </div>
        </div>
        <nav className="site-links">
          <a className={view === 'home' ? 'active' : ''} href="/index.html">Find Stay</a>
          <a className={view === 'stays' ? 'active' : ''} href="/stays.html">Stays</a>
          <a className={view === 'rooms' ? 'active' : ''} href="/rooms.html">Promotion</a>
          <a className={view === 'bookings' ? 'active' : ''} href="/bookings.html">Journal</a>
          <a className={view === 'auth' ? 'active' : ''} href="/auth.html">Pre-order</a>
        </nav>
        <div className="header-account">
          {user ? (
            <>
              {isAdmin ? (
                <a className="account-name" href="/admin.html">Admin</a>
              ) : null}
              <a className="account-name" href="/mypage.html">{user.name}</a>
              <button type="button" className="account-button" onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            <a className="account-link" href="/auth.html">Sign up / Login</a>
          )}
        </div>
      </header>

      {error ? <div className="toast">{error}</div> : null}

      <main className="site-main">
        <section className="page-hero">
          <div className="hero-banner">
            <div className="banner-tag">해외 스테이 지금 보기</div>
            <div className="banner-content">
              <button
                className="banner-arrow"
                type="button"
                onClick={() => setSlideIndex((prev) => (prev - 1  + slides.length) % slides.length)}
                aria-label="Previous slide"
              >
                {'<'}
              </button>
              <div className="banner-text" key={slideIndex}>
                <h1>{activeSlide.headline}</h1>
                <p>첫 구매 혜택부터 생일 쿠폰까지</p>
              </div>
              <button
                className="banner-arrow"
                type="button"
                onClick={() => setSlideIndex((prev) => (prev + 1) % slides.length)}
                aria-label="Next slide"
              >
                {'>'}
              </button>
            </div>
            <div className="banner-footer">
              <span className="line" />
              <span className="counter">
                {String(slideIndex + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
              </span>
            </div>
          </div>
          <div className="hero-card">
            <div className="hero-card-top">
              <span className="badge soft">Today's pick</span>
              <span className="badge warm">City deal</span>
            </div>
            {recommendRooms?.length === 0 ? (
              <div className="card muted">No rooms yet. Create your first stay.</div>
            ) : (
              <button
                type="button"
                className="hero-recommend"
                onClick={() => {
                  window.location.href = `/stay.html?id=${recommendRooms[0]._id}`;
                }}
              >
                <h2>Popular stays</h2>
                <div className="hero-card-footer">
                  <span className="price">{"$"}{recommendRooms[0].pricePerNight} / night</span>
                  <span className="badge cool">Review * {(recommendRooms[0].reviewCount || 0) > 0 ? Number(recommendRooms[0].ratingAverage || recommendRooms[0].rating || 0).toFixed(1) : '0.0'}</span>
                </div>
              </button>
            )}
          </div>
        </section>

        {view === 'home' ? (
          <section className="section">
            <div className="section-head wide">
              <div>
                <h2>Popular stays</h2>
                <p>Browse curated stays with strong reviews and quick booking.</p>
              </div>
              <a className="arrow-link" href="/rooms.html">{'>'}</a>
            </div>
            <div className="room-grid">
              {featuredRooms.length === 0 ? (
                <div className="card muted">No rooms yet. Create your first stay.</div>
              ) : (
                featuredRooms.map((room) => (
                  <div
                    className="room-card clickable"
                    key={room._id}
                    onClick={() => {
                      window.location.href = `/stay.html?id=${room._id}`;
                    }}
                  >
                    <div
                      className="room-thumb"
                      style={room.images?.[0] ? { backgroundImage: `url(${room.images[0]})` } : undefined}
                    />
                    <div className="room-card-header">
                      <span className="badge soft">{room.region || room.location}</span>
                      <span className="badge warm">Deal</span>
                      <span className="price">{"$"}{room.pricePerNight}</span>
                    </div>
                    <h3>{room.name}</h3>
                    <p>{room.summary || room.description || ""}</p>
                    <div className="meta">
                      <span className="badge cool">Rating {(room.reviewCount || 0) > 0 ? Number(room.ratingAverage || room.rating || 0).toFixed(1) : '0.0'}</span>
                      <span className="badge soft">Reviews {room.reviewCount || 0}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        ) : null}

        {view === 'home' ? (
          <section className="section">
            <div className="section-head">
                <h2>Popular stays</h2>
              <p>리뷰와 평점이 좋은 숙소를 모았어요.</p>
            </div>
            <div className="room-grid">
              {featuredRooms.length === 0 ? (
                <div className="card muted">No rooms yet. Create your first stay.</div>
              ) : (
                featuredRooms.map((room) => (
                  <div
                    className="room-card clickable"
                    key={room._id}
                    onClick={() => {
                      window.location.href = `/stay.html?id=${room._id}`;
                    }}
                  >
                    <div
                      className="room-thumb"
                      style={room.images?.[0] ? { backgroundImage: `url(${room.images[0]})` } : undefined}
                    />
                    <div className="room-card-header">
                      <span className="badge soft">{room.region || room.location}</span>
                      <span className="badge warm">특가</span>
                      <span className="price">{"$"}{room.pricePerNight}</span>
                    </div>
                    <h3>{room.name}</h3>
                    <p>{room.summary ||  ""}</p>
                    <div className="meta">
                      <span className="badge cool">평점 {(room.reviewCount || 0) > 0 ? Number(room.ratingAverage || room.rating || 0).toFixed(1) : '0.0'}</span>
                      <span className="badge soft">후기 {room.reviewCount || 0}개</span>
                      <span>{room.maxGuests} guests</span>
                      <span>{room.available ? 'Available' : 'Unavailable'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        ) : null}

        {view === 'stays' ? (
          <section className="section">
            <div className="section-head wide">
              <div>
                <h2>Popular stays</h2>
                <p>평점 높은 숙소를 둘러보세요.</p>
              </div>
              <div className="filter-row">
                <label className="filter-label">
                  Region
                  <select
                    name="region"
                    value={stayFilters.region}
                    onChange={handleStayFilterChange}
                  >
                    <option value="all">All</option>
                    {regions.map((region) => (
                      <option key={region} value={region}>
                        {region}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="filter-label">
                  Check in
                  <input
                    type="date"
                    name="checkIn"
                    value={stayFilters.checkIn}
                    onChange={handleStayFilterChange}
                  />
                </label>
                <label className="filter-label">
                  Check out
                  <input
                    type="date"
                    name="checkOut"
                    value={stayFilters.checkOut}
                    onChange={handleStayFilterChange}
                  />
                </label>
                <label className="filter-label">
                  Guests
                  <input
                    type="number"
                    min="1"
                    name="guests"
                    value={stayFilters.guests}
                    onChange={handleStayFilterChange}
                  />
                </label>
                  <label className="filter-label">
                    Sort
                    <select
                      value={priceSort}
                      onChange={(event) => setPriceSort(event.target.value)}
                    >
                      <option value="low">Low to high</option>
                      <option value="high">High to low</option>
                      <option value="reviews">Most reviews</option>
                    </select>
                  </label>
              </div>
            </div>
            <div className="room-grid">
              {availableStays.length === 0 ? (
                <div className="card muted">No stays match this filter.</div>
              ) : (
                availableStays.map((room) => (
                  <a
                    className="room-card clickable"
                    key={room._id}
                    href={`/stay.html?id=${room._id}`}
                  >
                    <div
                      className="room-thumb"
                      style={room.images?.[0] ? { backgroundImage: `url(${room.images[0]})` } : undefined}
                    />
                    <div className="room-card-header">
                      <span className="badge soft">{room.region || room.location}</span>
                      <span className="badge warm">특가</span>
                      <span className="price">{"$"}{room.pricePerNight}</span>
                    </div>
                    <h3>{room.name}</h3>
                    <p>{room.description ? `${room.description}` : '이 숙소를 구경해보세요.'}</p>
                    <div className="meta">
                      <span className="badge cool">평점 {(room.reviewCount || 0) > 0 ? Number(room.ratingAverage || room.rating || 0).toFixed(1) : '0.0'}</span>
                      <span className="badge soft">후기 {room.reviewCount || 0}개</span>
                      <span>{room.maxGuests} guests</span>
                      <span>{room.available ? 'Available' : 'Unavailable'}</span>
                    </div>
                  </a>
                ))
              )}
            </div>
          </section>
        ) : null}

        {view === 'stay' ? (
          <section className="section">
            <div className="panel">
              <div className="section-head">
                <h1>{activeStay ? activeStay.name : "View stay details."}</h1>
                <h2>Popular stays</h2>
                <p>Select a room type and continue to booking.</p>
              </div>
              {!token ? <p className="note">Please sign in to book.</p> : null}
              {activeStay ? (
                <>
                  <div className="room-type-grid">
                    <button
                      type="button"
                      className={`room-type-card ${bookingForm.roomType === 'twin' ? 'active' : ''}`}
                      onClick={() =>
                        setBookingForm((prev) => ({ ...prev, roomType: 'twin' }))
                      }
                    >
                      <div
                        className="room-type-thumb"
                        style={twinImage ? { backgroundImage: `url(${twinImage})` } : undefined}
                      />
                      <div>
                        <p className="eyebrow">Twin</p>
                        <p className="detail-value">{"$"}{twinPrice} / night</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      className={`room-type-card ${bookingForm.roomType === 'premium' ? 'active' : ''}`}
                      onClick={() =>
                        setBookingForm((prev) => ({ ...prev, roomType: 'premium' }))
                      }
                    >
                      <div
                        className="room-type-thumb"
                        style={premiumImage ? { backgroundImage: `url(${premiumImage})` } : undefined}
                      />
                      <div>
                        <p className="eyebrow">Premium</p>
                        <p className="detail-value">{"$"}{premiumPrice} / night</p>
                      </div>
                    </button>
                  </div>
                  <div className="field two">
                    <div className="field">
                      <label htmlFor="stayCheckIn">체크인</label>
                      <input
                        id="stayCheckIn"
                        name="checkIn"
                        type="date"
                        value={bookingForm.checkIn}
                        onChange={handleBookingChange}
                        min={today}
                        disabled={!activeStay}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="stayCheckOut">체크아웃</label>
                      <input
                        id="stayCheckOut"
                        name="checkOut"
                        type="date"
                        value={bookingForm.checkOut}
                        onChange={handleBookingChange}
                        min={minCheckOut || today}
                        disabled={!activeStay}
                      />
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="stayGuests">인원</label>
                    <input
                      id="stayGuests"
                      name="guests"
                      type="number"
                      min="1"
                      value={bookingForm.guests}
                      onChange={handleBookingChange}
                      disabled={!activeStay}
                    />
                  </div>
                  <div className="field">
                    <label>예상 금액</label>
                    <div className="detail-value">
                      {previewTotal > 0 ? `$${previewFinal.toLocaleString()}` : '날짜를 선택하세요'}
                    </div>
                  </div>
                  <div className="actions">
                    <button
                      type="button"
                      className="primary"
                      onClick={() =>
                        window.location.href = `/reserve.html?id=${activeStay._id}&roomType=${bookingForm.roomType}`
                      }
                    >
                      예약하기 </button>
                    <button type="button" className="ghost" onClick={handleOpenDirections}>
                      길찾기 </button>
                  </div>
                </>
              ) : (
                <div className="card muted">No stay selected.</div>
              )}
            </div>
            <div className="panel">
              <div className="section-head">
                <h1>{activeStay ? activeStay.name : "숙소 후기"}</h1>
                <h2>Popular stays</h2>
                <p>이 숙소에 대한 실제 후기를 확인하세요.</p>
              </div>
              <div className="list">
                {reviews.length === 0 ? (
                  <div className="card muted">아직 등록된 후기가 없습니다.</div>
                ) : (
                  reviews.map((review) => (
                    <div className="card" key={review._id}>
                      <div className="room-card-header">
                        <span className="badge soft">{review.user?.name || 'Guest'}</span>
                         <span className="badge cool">평점 {Number(review.rating || 0).toFixed(1)}</span>
                      </div>
                      {review.images?.length ? (
                        <div className="thumb-grid">
                          {review.images.map((url) => (
                            <div className="thumb-item" key={url}>
                              <div
                                className="thumb-image"
                                style={{ backgroundImage: `url(${url})` }}
                              />
                            </div>
                          ))}
                        </div>
                      ) : null}
                      {review.comment ? <p>{review.comment}</p> : <p className="note">No comment.</p>}
                    </div>
                  ))
                )}
              </div>
              {token ? (
                <form onSubmit={handleReviewSubmit} className="card soft">
                  <div className="field">
                    <label htmlFor="reviewRating">평점</label>
                    <select
                      id="reviewRating"
                      name="rating"
                      value={reviewForm.rating}
                      onChange={handleReviewChange}
                    >
                      <option value="5">5</option>
                      <option value="4">4</option>
                      <option value="3">3</option>
                      <option value="2">2</option>
                      <option value="1">1</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="reviewComment">리뷰 작성</label>
                    <textarea
                      id="reviewComment"
                      name="comment"
                      value={reviewForm.comment}
                      onChange={handleReviewChange}
                      placeholder="리뷰 작성"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="reviewImages">파일 선택</label>
                    <input
                      id="reviewImages"
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(event) => setReviewFiles(Array.from(event.target.files || []))}
                    />
                    {reviewPreviews.length ? (
                      <div className="thumb-grid">
                        {reviewPreviews.map((url) => (
                          <div className="thumb-item" key={url}>
                            <div
                              className="thumb-image"
                              style={{ backgroundImage: `url(${url})` }}
                            />
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="actions">
                    <button type="submit" className="primary">후기 등록</button>
                  </div>
                </form>
              ) : (
                <div className="note">로그인 후 후기를 작성할 수 있습니다.</div>
              )}
            </div>
          </section>
        ) : null}

        {view === 'reserve' ? (
          <section className="section split">
            <div className="panel">
              <div className="section-head">
                <h1>{activeStay ? activeStay.name : "예약하기"}</h1>
                <h2>Popular stays</h2>
                <p>객실과 날짜를 선택하세요.</p>
              </div>
              {activeStay ? (
                <>
                  <div className="detail-rooms">
                    <p className="eyebrow">媛앹떎 ?좏깮</p>
                    <div className="room-type-grid">
                      <button
                        type="button"
                        className={`room-type-card ${bookingForm.roomType === 'twin' ? 'active' : ''}`}
                        onClick={() =>
                          setBookingForm((prev) => ({ ...prev, roomType: 'twin' }))
                        }
                      >
                        <div
                          className="room-type-thumb"
                          style={twinImage ? { backgroundImage: `url(${twinImage})` } : undefined}
                        />
                        <div>
                          <p className="eyebrow">Twin</p>
                          <p className="detail-value">{"$"}{twinPrice} / night</p>
                        </div>
                      </button>
                      <button
                        type="button"
                        className={`room-type-card ${bookingForm.roomType === 'premium' ? 'active' : ''}`}
                        onClick={() =>
                          setBookingForm((prev) => ({ ...prev, roomType: 'premium' }))
                        }
                      >
                        <div
                          className="room-type-thumb"
                          style={premiumImage ? { backgroundImage: `url(${premiumImage})` } : undefined}
                        />
                        <div>
                          <p className="eyebrow">Premium</p>
                          <p className="detail-value">{"$"}{premiumPrice} / night</p>
                        </div>
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="card muted">No stay selected.</div>
              )}
            </div>

            <div className="panel">
              <div className="section-head">
                <h1>{activeStay ? activeStay.name : "예약 정보"}</h1>
                <h2>Popular stays</h2>
                <p>결제 방식과 날짜를 입력하세요.</p>
              </div>
              {!token ? <p className="note">Please sign in to book.</p> : null}
              <form onSubmit={handleBookingSubmit} ref={bookingSectionRef}>
                <div className="field">
                  <label>Payment method</label>
                  <div className="payment-options">
                    <label className={`payment-option ${paymentMethod === 'kakaopay' ? 'active' : ''}`}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="kakaopay"
                        checked={paymentMethod === 'kakaopay'}
                        onChange={(event) => setPaymentMethod(event.target.value)}
                        disabled={!token || !activeStay}
                      />
                      <span className="payment-logo kakao">K</span>
                      <span className="payment-title">KakaoPay</span>
                    </label>
                    <label className={`payment-option ${paymentMethod === 'card' ? 'active' : ''}`}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="card"
                        checked={paymentMethod === 'card'}
                        onChange={(event) => setPaymentMethod(event.target.value)}
                        disabled={!token || !activeStay}
                      />
                      <span className="payment-logo card">C</span>
                      <span className="payment-title">Card</span>
                    </label>
                  </div>
                </div>
                <div className="field two">
                  <div>
                    <label htmlFor="reserveCheckIn">Check in</label>
                    <input
                      id="reserveCheckIn"
                      name="checkIn"
                      type="date"
                      value={bookingForm.checkIn}
                      onChange={handleBookingChange}
                      disabled={!token || !activeStay}
                      min={today}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="reserveCheckOut">Check out</label>
                    <input
                      id="reserveCheckOut"
                      name="checkOut"
                      type="date"
                      value={bookingForm.checkOut}
                      onChange={handleBookingChange}
                      disabled={!token || !activeStay}
                      min={minCheckOut || today}
                      required
                    />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="reserveGuests">Guests</label>
                  <input
                    id="reserveGuests"
                    name="guests"
                    type="number"
                    min="1"
                    value={bookingForm.guests}
                    onChange={handleBookingChange}
                    disabled={!token || !activeStay}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="couponCode">쿠폰 코드</label>
                  <div className="field-inline">
                    <input
                      id="couponCode"
                      name="couponCode"
                      value={couponCode}
                      onChange={(event) => setCouponCode(event.target.value)}
                      placeholder="예: WELCOME10"
                      disabled={!token || !activeStay}
                    />
                    <button type="button" className="ghost" onClick={handleApplyCoupon} disabled={!token || !activeStay}>
                      적용
                    </button>
                  </div>
                  {couponError ? <p className="note">{couponError}</p> : null}
                  {couponInfo ? (
                    <p className="note">
                      적용됨: {couponInfo.code} ({couponInfo.type === 'fixed' ? `$${couponInfo.amount} 할인` : `${couponInfo.amount}% 할인`})
                    </p>
                  ) : null}
                </div>
                <div className="field">
                  <label>Estimated total</label>
                  <div className="detail-value">
                    {previewTotal > 0 ? `$${previewFinal.toLocaleString()}` : '날짜를 선택하세요'}
                  </div>
                </div>
                <div className="actions">
                  <button type="submit" className="primary" disabled={!token || !activeStay}>
                    Book now
                  </button>
                </div>
              </form>
              <div className="availability-block">
                <p className="eyebrow">Unavailable dates</p>
                {bookedRanges.length === 0 ? (
                  <p className="detail-description">No blocked dates right now.</p>
                ) : (
                  <div className="availability-list">
                    {bookedRanges.map((range, index) => (
                      <div className="availability-item" key={`${range.checkIn}-${index}`}>
                        {new Date(range.checkIn).toLocaleDateString()} -{' '}
                        {new Date(range.checkOut).toLocaleDateString()}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        ) : null}

        {view === 'payment' ? (
          <section className="section">
            <div className="panel">
              <div className="section-head">
                <h1>{activeStay ? activeStay.name : "숙소 등록"}</h1>
                <h2>Popular stays</h2>
                <p>숙소 정보를 입력해주세요.</p>
              </div>
              <div className="detail-description">
                This may take a few seconds. Do not close the window.
              </div>
              <div className="actions">
                <a className="button ghost" href="/mypage.html">Go to My Page</a>
              </div>
            </div>
          </section>
        ) : null}

        {view === 'rooms' ? (
          <section className="section split">
            <div className="panel">
              <div className="section-head">
                <h1>{activeStay ? activeStay.name : "숙소 등록"}</h1>
                {/* <p>숙소 등록</p> */}
              </div>
              {!isAdmin ? (
                <p className="note">Admin role can edit rooms. Create an admin account to enable edits.</p>
              ) : null}
              <form onSubmit={handleRoomSubmit}>
                <div className="field">
                  <label htmlFor="roomName">Name</label>
                  <input id="roomName" name="name" value={roomForm.name} onChange={handleRoomChange} required />
                </div>
                <div className="field two">
                  <div className="field">
                    <label htmlFor="region">Region</label>
                    <select
                      id="region"
                      name="region"
                      value={roomForm.region}
                      onChange={handleRoomChange}
                      required
                    >
                      <option value="">Select region</option>
                      <option value="Seoul">Seoul</option>
                      <option value="Busan">Busan</option>
                      <option value="Daegu">Daegu</option>
                      <option value="Incheon">Incheon</option>
                      <option value="Gwangju">Gwangju</option>
                      <option value="Daejeon">Daejeon</option>
                      <option value="Ulsan">Ulsan</option>
                      <option value="Sejong">Sejong</option>
                      <option value="Gyeonggi">Gyeonggi</option>
                      <option value="Gangwon">Gangwon</option>
                      <option value="Chungbuk">Chungbuk</option>
                      <option value="Chungnam">Chungnam</option>
                      <option value="Jeonbuk">Jeonbuk</option>
                      <option value="Jeonnam">Jeonnam</option>
                      <option value="Gyeongbuk">Gyeongbuk</option>
                      <option value="Gyeongnam">Gyeongnam</option>
                      <option value="Jeju">Jeju</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="location">Address</label>
                    <div className="field-inline">
                      <input
                        id="location"
                        name="location"
                        value={roomForm.location}
                        readOnly
                        placeholder="Wifi, Pool, Kitchen"
                        required
                      />
                      <button type="button" className="ghost" onClick={handleOpenPostcode}>
                        주소 찾기 </button>
                    </div>
                  </div>
                </div>
                <div className="field two">
                  <div className="field">
                    <label htmlFor="pricePerNight">Price per night</label>
                    <input
                      id="pricePerNight"
                      name="pricePerNight"
                      type="number"
                      value={roomForm.pricePerNight}
                      onChange={handleRoomChange}
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="maxGuests">Max guests</label>
                    <input
                      id="maxGuests"
                      name="maxGuests"
                      type="number"
                      value={roomForm.maxGuests}
                      onChange={handleRoomChange}
                      required
                    />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="rating">Rating</label>
                  <input
                    id="rating"
                    name="rating"
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={roomForm.rating}
                    onChange={handleRoomChange}
                  />
                </div>
                <div className="checkbox">
                  <input
                    id="available"
                    name="available"
                    type="checkbox"
                    checked={roomForm.available}
                    onChange={handleRoomChange}
                  />
                  <label htmlFor="available">Available</label>
                </div>
                <div className="field">
                  <label htmlFor="images">Images</label>
                  <input
                    id="images"
                    name="images"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleRoomFilesChange}
                  />
                  {roomForm.images ? (
                    <p className="note">Existing images will stay unless you upload new files.</p>
                  ) : null}
                  {existingImageList.length ? (
                    <div className="thumb-grid">
                      {existingImageList.map((url, index) => (
                        <div className="thumb-item" key={url}>
                          <div
                            className="thumb-image"
                            style={{ backgroundImage: `url(${url})` }}
                          />
                          <div className="thumb-meta">
                            <span className="thumb-label">Existing</span>
                            <button
                              type="button"
                              className="thumb-remove"
                              onClick={() => handleRemoveExistingImage(index)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {uploadPreviews.length ? (
                    <div className="thumb-grid">
                      {uploadPreviews.map((item, index) => (
                        <div className="thumb-item" key={item.url}>
                          <div
                            className="thumb-image"
                            style={{ backgroundImage: `url(${item.url})` }}
                          />
                          <div className="thumb-meta">
                            <span className="thumb-label">New</span>
                            <button
                              type="button"
                              className="thumb-remove"
                              onClick={() => handleRemoveUploadImage(index)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="field">
                  <label htmlFor="amenities">Amenities</label>
                  <input
                    id="amenities"
                    name="amenities"
                    value={roomForm.amenities}
                    onChange={handleRoomChange}
                    placeholder="Search address"
                  />
                </div>
                <div className="field">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    name="description"
                    value={roomForm.description}
                    onChange={handleRoomChange}
                  />
                </div>
                <div className="actions">
                  <button type="submit" className="primary" disabled={!isAdmin}>
                    {editingRoomId ? 'Update room' : 'Create room'}
                  </button>
                  {editingRoomId ? (
                    <button type="button" className="ghost" onClick={handleRoomCancel}>
                      Cancel
                    </button>
                  ) : null}
                </div>
              </form>
            </div>

            <div className="panel">
              <div className="section-head">
                <h1>{activeStay ? activeStay.name : "예약하기"}</h1>
                <h2>Popular stays</h2>
                <p>예약 정보를 입력하세요.</p>
              </div>
              <div className="list">
                {rooms.length === 0 ? <div className="card muted">No rooms yet.</div> : null}
                {rooms.map((room) => (
                  <div className="room-card wide" key={room._id}>
                    <div
                      className="room-thumb"
                      style={room.images?.[0] ? { backgroundImage: `url(${room.images[0]})` } : undefined}
                    />
                    <div className="room-card-header">
                      <span className="badge soft">{room.region || room.location}</span>
                      <span className="price">{"$"}{room.pricePerNight}</span>
                    </div>
                    <h3>{room.name}</h3>
                    <p>{room.description ? `${room.description}` : '숙소 설명란'}</p>
                    <div className="meta">
                      <span>{room.available ? 'Available' : 'Unavailable'}</span>
                      <span>{room.maxGuests} guests</span>
                    </div>
                    <div className="actions">
                      <button className="ghost" type="button" onClick={() => handleRoomEdit(room)} disabled={!isAdmin}>
                        Edit
                      </button>
                      <button className="danger" type="button" onClick={() => handleRoomDelete(room._id)} disabled={!isAdmin}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {view === 'admin' ? (
          <section className="section split">
            <div className="panel">
              <div className="section-head">
                <h1>관리자 페이지</h1>
                <h2>쿠폰 관리</h2>
                <p>숙소별 쿠폰을 발급하고 관리하세요.</p>
              </div>
              {!isAdmin ? (
                <p className="note">관리자만 접근할 수 있습니다.</p>
              ) : null}
              {isAdmin ? (
                <form onSubmit={handleCreateCoupon} className="card soft">
                  <h3>쿠폰 발급</h3>
                  <div className="field">
                    <label htmlFor="couponCodeAdmin">쿠폰 코드</label>
                    <input
                      id="couponCodeAdmin"
                      name="code"
                      value={couponForm.code}
                      onChange={handleCouponChange}
                      placeholder="예: WELCOME10"
                      required
                    />
                  </div>
                  <div className="field two">
                    <div className="field">
                      <label htmlFor="couponType">할인 타입</label>
                      <select
                        id="couponType"
                        name="type"
                        value={couponForm.type}
                        onChange={handleCouponChange}
                      >
                        <option value="percent">퍼센트(%)</option>
                        <option value="fixed">정액</option>
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="couponAmount">할인 값</label>
                      <input
                        id="couponAmount"
                        name="amount"
                        type="number"
                        min="0"
                        value={couponForm.amount}
                        onChange={handleCouponChange}
                        required
                      />
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="couponRoomId">적용 숙소</label>
                    <select
                      id="couponRoomId"
                      name="roomId"
                      value={couponForm.roomId}
                      onChange={handleCouponChange}
                    >
                      <option value="">전체 숙소</option>
                      {rooms.map((room) => (
                        <option key={room._id} value={room._id}>
                          {room.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field two">
                    <div className="field">
                      <label htmlFor="couponMaxUses">선착순 인원(최대 사용)</label>
                      <input
                        id="couponMaxUses"
                        name="maxUses"
                        type="number"
                        min="0"
                        value={couponForm.maxUses}
                        onChange={handleCouponChange}
                        placeholder="예: 100"
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="couponExpiresAt">만료일</label>
                      <input
                        id="couponExpiresAt"
                        name="expiresAt"
                        type="date"
                        value={couponForm.expiresAt}
                        onChange={handleCouponChange}
                      />
                    </div>
                  </div>
                  <div className="actions">
                    <button type="submit" className="primary">쿠폰 생성</button>
                  </div>
                </form>
              ) : null}
            </div>

            <div className="panel">
              <div className="section-head">
                <h1>쿠폰 목록</h1>
                <h2>발급 현황</h2>
                <p>쿠폰 사용 현황을 확인하세요.</p>
              </div>
              {couponLoading ? (
                <p className="note">불러오는 중...</p>
              ) : coupons.length === 0 ? (
                <p className="note">등록된 쿠폰이 없습니다.</p>
              ) : (
                <div className="list">
                  {coupons.map((coupon) => (
                    <div className="card muted" key={coupon._id}>
                      <div className="room-card-header">
                        <span className="badge soft">{coupon.code}</span>
                        <span>
                          {coupon.type === 'fixed'
                            ? `$${coupon.amount} 할인`
                            : `${coupon.amount}% 할인`}
                        </span>
                      </div>
                      <p className="note">
                        사용 {coupon.usedCount || 0}
                        {typeof coupon.maxUses === 'number' ? ` / ${coupon.maxUses}` : ' / 무제한'}
                      </p>
                      <p className="note">
                        남은 수량 {typeof coupon.maxUses === 'number'
                          ? Math.max(0, coupon.maxUses - (coupon.usedCount || 0))
                          : '무제한'}
                      </p>
                      <p className="note">
                        적용 숙소: {coupon.rooms && coupon.rooms.length
                          ? coupon.rooms.map((room) => room.name || room).join(', ')
                          : '전체'}
                      </p>
                      {coupon.expiresAt ? (
                        <p className="note">만료: {new Date(coupon.expiresAt).toLocaleDateString()}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        ) : null}

        {view === 'bookings' ? (
          <section className="section split">
            <div className="panel">
              <div className="section-head">
                <h1>{activeStay ? activeStay.name : "예약 내역"}</h1>
                <h2>Popular stays</h2>
                <p>예약 현황을 관리하세요.</p>
              </div>
              {!token ? <p className="note">Please sign in to book.</p> : null}
              <form onSubmit={handleBookingSubmit}>
                <div className="field">
                  <label htmlFor="roomId">Room</label>
                  <select
                    id="roomId"
                    name="roomId"
                    value={bookingForm.roomId}
                    onChange={handleBookingChange}
                    disabled={!token}
                    required
                  >
                    <option value="">Select a room</option>
                    {rooms.map((room) => (
                      <option value={room._id} key={room._id}>
                        {room.name} - {room.region || room.location}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="roomType">Room type</label>
                  <select
                    id="roomType"
                    name="roomType"
                    value={bookingForm.roomType}
                    onChange={handleBookingChange}
                    disabled={!token}
                    required
                  >
                    <option value="twin">Twin room</option>
                    <option value="premium">Premium room</option>
                  </select>
                </div>
                <div className="field two">
                  <div>
                    <label htmlFor="checkIn">Check in</label>
                    <input
                      id="checkIn"
                      name="checkIn"
                      type="date"
                      value={bookingForm.checkIn}
                      onChange={handleBookingChange}
                      disabled={!token}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="checkOut">Check out</label>
                    <input
                      id="checkOut"
                      name="checkOut"
                      type="date"
                      value={bookingForm.checkOut}
                      onChange={handleBookingChange}
                      disabled={!token}
                      required
                    />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="guests">Guests</label>
                  <input
                    id="guests"
                    name="guests"
                    type="number"
                    min="1"
                    value={bookingForm.guests}
                    onChange={handleBookingChange}
                    disabled={!token}
                    required
                  />
                </div>
                <div className="actions">
                  <button type="submit" className="primary" disabled={!token}>
                    Create booking
                  </button>
                </div>
              </form>
            </div>

            <div className="panel">
              <div className="section-head">
                <h1>{activeStay ? activeStay.name : "예약 내역"}</h1>
                <h2>Popular stays</h2>
                <p>예약 내역</p>
              </div>
              <div className="list">
                {token && bookings.length === 0 ? <div className="card muted">No bookings yet.</div> : null}
                {bookings.map((booking) => (
                  <div className="room-card wide" key={booking._id}>
                    <div className="room-card-header">
                      <span className="badge soft">{booking.room?.region || booking.room?.location || 'Stay'}</span>
                      <span className="price">{"$"}{booking.totalPrice}</span>
                    </div>
                    <h3>{booking.room?.name || 'Room'}</h3>
                    <p>
                      {new Date(booking.checkIn).toLocaleDateString()} -{' '}
                      {new Date(booking.checkOut).toLocaleDateString()}
                    </p>
                    <div className="meta">
                      <span>{booking.status}</span>
                      <span>{booking.roomType === 'premium' ? 'Premium room' : 'Twin room'}</span>
                      <span>{booking.guests} guests</span>
                      {user?.role === 'admin' && booking.user?.name ? (
                        <span>{booking.user.name}</span>
                      ) : null}
                    </div>
                    {booking.status !== 'cancelled' ? (
                      <div className="actions">
                        <button
                          type="button"
                          className="danger"
                          onClick={() => {
                            setCancelTargetId(booking._id);
                            setCancelConfirmOpen(true);
                          }}
                        >
                          Cancel
                        </button>
                        {isCompletedBooking(booking) ? (
                          <button
                            type="button"
                            className="ghost"
                            onClick={() => handleToggleBookingReview(booking._id)}
                          >
                            후기 작성                          </button>
                        ) : null}
                      </div>
                    ) : null}
                    {isCompletedBooking(booking) ? (
                      <form
                        className="card soft"
                        onSubmit={(event) => handleBookingReviewSubmit(event, booking)}
                        style={{ display: reviewForms[booking._id]?.open ? 'block' : 'none' }}
                      >
                        <div className="field">
                          <label htmlFor={`reviewRating-${booking._id}`}>평점</label>
                          <select
                            id={`reviewRating-${booking._id}`}
                            value={(reviewForms[booking._id]?.rating) || '5'}
                            onChange={(event) =>
                              handleBookingReviewChange(booking._id, 'rating', event.target.value)
                            }
                          >
                            <option value="5">5</option>
                            <option value="4">4</option>
                            <option value="3">3</option>
                            <option value="2">2</option>
                            <option value="1">1</option>
                          </select>
                        </div>
                        <div className="field">
                          <label htmlFor={`reviewComment-${booking._id}`}>후기 내용</label>
                          <textarea
                            id={`reviewComment-${booking._id}`}
                            value={(reviewForms[booking._id]?.comment) || ''}
                            onChange={(event) =>
                              handleBookingReviewChange(booking._id, 'comment', event.target.value)
                            }
                            placeholder="Search address"
                          />
                        </div>
                        <div className="field">
                          <label htmlFor={`reviewImages-${booking._id}`}>사진 첨부</label>
                            <input
                              id={`reviewImages-${booking._id}`}
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={(event) =>
                                handleBookingReviewFilesChange(
                                  booking._id,
                                  Array.from(event.target.files || [])
                                )
                              }
                            />
                            {(reviewForms[booking._id]?.previews || []).length ? (
                              <div className="thumb-grid">
                                {(reviewForms[booking._id]?.previews || []).map((url, index) => (
                                  <div className="thumb-item" key={url}>
                                    <div
                                      className="thumb-image"
                                      style={{ backgroundImage: `url(${url})` }}
                                    />
                                    <div className="thumb-meta">
                                      <span className="thumb-label">New</span>
                                      <button
                                        type="button"
                                        className="thumb-remove"
                                        onClick={() => handleRemoveBookingReviewFile(booking._id, index)}
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        <div className="actions">
                          <button type="submit" className="primary">후기 등록</button>
                        </div>
                      </form>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}


        {view === 'mypage' ? (
          <section className="section split">
            <div className="panel">
              <div className="section-head">
                <h1>{activeStay ? activeStay.name : "마이페이지"}</h1>
                <h2>Popular stays</h2>
                <p>나의 예약을 확인하세요.</p>
              </div>
              {!token ? <p className="note">Please sign in to view bookings.</p> : null}
              <div className="list">
                {token && bookings.length === 0 ? <div className="card muted">No bookings yet.</div> : null}
                {bookings.map((booking) => (
                  <div className="room-card wide" key={booking._id}>
                    <div className="room-card-header">
                      <span><h3>{formatKstDateTime(booking.createdAt)}</h3></span>
                      <span className="badge soft">{booking.room?.region || booking.room?.location || 'Stay'}</span>
                      <span className="price">{"$"}{booking.totalPrice}</span>
                    </div>
                    <h3>{booking.room?.name || 'Room'}</h3>
                    <p>
                      {new Date(booking.checkIn).toLocaleDateString()} -{' '}
                      {new Date(booking.checkOut).toLocaleDateString()}
                    </p>
                    <div className="meta">
                      <span>{booking.status}</span>
                      <span>{booking.roomType === 'premium' ? 'Premium room' : 'Twin room'}</span>
                      <span>{booking.guests} guests</span>
                      {user?.role === 'admin' && booking.user?.name ? (
                        <span>{booking.user.name}</span>
                      ) : null}
                    </div>
                    {booking.status !== 'cancelled' ? (
                      <div className="actions">
                        <button
                          type="button"
                          className="danger"
                          onClick={() => {
                            setCancelTargetId(booking._id);
                            setCancelConfirmOpen(true);
                          }}
                        >
                          Cancel
                        </button>
                        {isCompletedBooking(booking) ? (
                          <button
                            type="button"
                            className="ghost"
                            onClick={() => handleToggleBookingReview(booking._id)}
                          >
                            후기 작성                          </button>
                        ) : null}
                      </div>
                    ) : null}
                    {isCompletedBooking(booking) ? (
                      <form
                        className="card soft"
                        onSubmit={(event) => handleBookingReviewSubmit(event, booking)}
                        style={{ display: reviewForms[booking._id]?.open ? 'block' : 'none' }}
                      >
                        <div className="field">
                          <label htmlFor={`reviewRating-${booking._id}`}>?됱젏</label>
                          <select
                            id={`reviewRating-${booking._id}`}
                            value={(reviewForms[booking._id]?.rating) || '5'}
                            onChange={(event) =>
                              handleBookingReviewChange(booking._id, 'rating', event.target.value)
                            }
                          >
                            <option value="5">5</option>
                            <option value="4">4</option>
                            <option value="3">3</option>
                            <option value="2">2</option>
                            <option value="1">1</option>
                          </select>
                        </div>
                        <div className="field">
                          <label htmlFor={`reviewComment-${booking._id}`}>후기 내용</label>
                          <textarea
                            id={`reviewComment-${booking._id}`}
                            value={(reviewForms[booking._id]?.comment) || ''}
                            onChange={(event) =>
                              handleBookingReviewChange(booking._id, 'comment', event.target.value)
                            }
                            placeholder="Search address"
                          />
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              onChange={(event) =>
                                handleBookingReviewFilesChange(
                                  booking._id,
                                  Array.from(event.target.files || [])
                                )
                              }
                            />
                            {(reviewForms[booking._id]?.previews || []).length ? (
                              <div className="thumb-grid">
                                {(reviewForms[booking._id]?.previews || []).map((url, index) => (
                                  <div className="thumb-item" key={url}>
                                    <div
                                      className="thumb-image"
                                      style={{ backgroundImage: `url(${url})` }}
                                    />
                                    <div className="thumb-meta">
                                      <span className="thumb-label">New</span>
                                      <button
                                        type="button"
                                        className="thumb-remove"
                                        onClick={() => handleRemoveBookingReviewFile(booking._id, index)}
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        <div className="actions">
                          <button type="submit" className="primary">후기 등록</button>
                        </div>
                      </form>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
            <div className="panel">
              <div className="section-head">
                <h1>{activeStay ? activeStay.name : "내 정보"}</h1>
                <h2>Popular stays</h2>
                <p>계정과 활동을 확인하세요.</p>
              </div>
              {user ? (
                <div className="profile-card">
                  <div>
                    <p className="eyebrow">Signed in</p>
                    <h3>{user.name}</h3>
                    <p>예약 내역과 활동을 한눈에 확인할 수 있습니다.</p>
                    <span className="badge cool">{user.role}</span>
                  </div>
                    <div className="actions">
                      <button type="button" className="danger" onClick={handleLogout}>
                        Sign out
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="card muted">Sign in to manage your account.</div>
                )}
                <div className="card soft activity-card">
                  <h3>Activity</h3>
                  {activities.length === 0 ? (
                    <p className="note">No activity yet.</p>
                  ) : (
                    <div className="list">
                      {activities.map((activity) => (
                        <div className="card muted" key={activity._id}>
                          <div className="room-card-header">
                            <span className="badge soft">{activity.room?.name || 'Stay'}</span>
                            <span>{formatKstDateTime(activity.createdAt)}</span>
                          </div>
                          <p>최근 활동 내역입니다.</p>
                          {activity.booking?.checkIn ? (
                            <p className="note">
                              {new Date(activity.booking.checkIn).toLocaleDateString()} -{' '}
                              {new Date(activity.booking.checkOut).toLocaleDateString()}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <form className="card soft faq-card" onSubmit={handleInquirySubmit}>
                  <h3>문의 자동응답</h3>
                  <p className="note">자주 묻는 질문을 입력하면 답변을 보여드려요.</p>
                  <label htmlFor="inquiryText" className="sr-only">臾몄쓽 ?댁슜</label>
                  <textarea
                    id="inquiryText"
                    value={inquiryText}
                    onChange={(event) => setInquiryText(event.target.value)}
                    placeholder="Search address"
                  />
                  <div className="actions">
                    <button type="submit" className="primary">문의하기</button>
                  </div>
                  {inquiryReply ? (
                    <div className="faq-reply">{inquiryReply}</div>
                  ) : null}
                </form>
              </div>
            </section>
          ) : null}

        {view === 'auth' ? (
          <section className="section split">
            <div className="panel">
              <div className="section-head">
                <h1>{activeStay ? activeStay.name : "계정"}</h1>
                <h2>Popular stays</h2>
                <p>로그인 및 회원가입을 진행하세요.</p>
              </div>
              {user ? (
                <div className="profile-card">
                  <div>
                    <p className="eyebrow">Signed in</p>
                    <h3>{user.name}</h3>
                    <p>계정 정보를 확인하고 관리할 수 있습니다.</p>
                    <span className="badge cool">{user.role}</span>
                  </div>
                  <div className="actions">
                    <button type="button" className="danger" onClick={handleLogout}>
                      Sign out
                    </button>
                  </div>
                </div>
              ) : (
                <div className="auth-grid">
                  <form onSubmit={handleRegister} className="card soft">
                    <h3>Create account</h3>
                    <div className="field">
                      <label htmlFor="name">Name</label>
                      <input id="name" name="name" value={authForm.name} onChange={handleAuthChange} required />
                    </div>
                    <div className="field">
                      <label htmlFor="email">Email</label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        value={authForm.email}
                        onChange={handleAuthChange}
                        required
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="password">Password</label>
                      <input
                        id="password"
                        name="password"
                        type="password"
                        value={authForm.password}
                        onChange={handleAuthChange}
                        required
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="role">Role</label>
                      <select id="role" name="role" value={authForm.role} onChange={handleAuthChange}>
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div className="actions">
                      <button type="submit" className="primary">Sign up</button>
                    </div>
                  </form>
                  <form onSubmit={handleLogin} className="card soft">
                    <h3>Login</h3>
                    <div className="field">
                      <label htmlFor="loginEmail">Email</label>
                      <input
                        id="loginEmail"
                        name="email"
                        type="email"
                        value={loginForm.email}
                        onChange={handleLoginChange}
                        required
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="loginPassword">Password</label>
                      <input
                        id="loginPassword"
                        name="password"
                        type="password"
                        value={loginForm.password}
                        onChange={handleLoginChange}
                        required
                      />
                    </div>
                    <div className="actions">
                      <button type="submit" className="ghost">Sign in</button>
                    </div>
                  </form>
                </div>
              )}
            </div>
            <div className="panel">
              <div className="section-head">
                <h1>{activeStay ? activeStay.name : "서비스 안내"}</h1>
                <h2>Popular stays</h2>
                <p>스테이폴리오의 주요 특징입니다.</p>
              </div>
              <div className="feature-stack">
                <div className="feature-card">
                  <h3>Curated inventory</h3>
                  <p>엄선된 숙소만 소개합니다.</p>
                </div>
                <div className="feature-card">
                  <h3>Booking clarity</h3>
                  <p>예약 과정을 쉽고 명확하게 제공합니다.</p>
                </div>
                <div className="feature-card">
                  <h3>Roles built in</h3>
                  <p>관리자/사용자 역할이 분리되어 있어요.</p>
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </main>
      {searchOpen ? (
        <div className="modal-overlay" onClick={() => setSearchOpen(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>Find your stay</h3>
              <button type="button" className="ghost" onClick={() => setSearchOpen(false)}>
                Close
              </button>
            </div>
            <div className="modal-grid">
              <label className="field">
                Region
                <select name="region" value={modalFilters.region} onChange={handleSearchChange}>
                  <option value="all">All</option>
                  {regions.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Check in
                <input
                  type="date"
                  name="checkIn"
                  value={modalFilters.checkIn}
                  onChange={handleSearchChange}
                />
              </label>
              <label className="field">
                Check out
                <input
                  type="date"
                  name="checkOut"
                  value={modalFilters.checkOut}
                  onChange={handleSearchChange}
                />
              </label>
              <label className="field">
                Guests
                <input
                  type="number"
                  min="1"
                  name="guests"
                  value={modalFilters.guests}
                  onChange={handleSearchChange}
                />
              </label>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="primary"
                onClick={() => {
                  const params = new URLSearchParams({
                    region: modalFilters.region,
                    checkIn: modalFilters.checkIn,
                    checkOut: modalFilters.checkOut,
                    guests: modalFilters.guests
                  });
                  setSearchOpen(false);
                  window.location.href = `/stays.html?${params.toString()}`;
                }}
              >
                Search stays
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {bookingSuccessOpen ? (
        <div className="modal-overlay" onClick={() => setBookingSuccessOpen(false)}>
          <div className="modal success-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>예약이 완료되었습니다.</h3>
              <button type="button" className="ghost" onClick={() => setBookingSuccessOpen(false)}>
                Close
              </button>
            </div>
            <p className="detail-description">예약이 정상적으로 접수되었습니다.</p>
            <div className="modal-actions">
              <button
                type="button"
                className="primary"
                onClick={() => setBookingSuccessOpen(false)}
              >
                ?뺤씤              </button>
            </div>
          </div>
        </div>
      ) : null}
      {cancelConfirmOpen ? (
        <div className="modal-overlay" onClick={() => setCancelConfirmOpen(false)}>
          <div className="modal success-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>예약을 취소할까요?</h3>
              <button type="button" className="ghost" onClick={() => setCancelConfirmOpen(false)}>
                Close
              </button>
            </div>
            <p className="detail-description">정말 예약을 취소하시겠습니까?</p>
            <div className="modal-actions">
              <button
                type="button"
                className="ghost"
                onClick={() => setCancelConfirmOpen(false)}
              >
                아니오 </button>
              <button
                type="button"
                className="primary"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  confirmCancelBooking();
                }}
              >
                네, 취소              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ReactRedux.Provider store={store}>
    <App />
  </ReactRedux.Provider>
);
