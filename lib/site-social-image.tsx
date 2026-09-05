export function siteSocialImage() {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: '#102719',
        color: '#ffffff',
        padding: '72px 80px',
        fontFamily: 'Arial, Helvetica, sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div
            style={{
              width: 68,
              height: 68,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '4px solid #e1b63f',
              borderRadius: 16,
              color: '#e1b63f',
              fontSize: 24,
              fontWeight: 800,
            }}
          >
            FMS
          </div>
          <div style={{ display: 'flex', fontSize: 34, fontWeight: 800, letterSpacing: -1 }}>
            <span>Farm Machine&nbsp;</span><span style={{ color: '#e1b63f' }}>Specs</span>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            padding: '10px 16px',
            border: '1px solid rgba(255,255,255,.25)',
            borderRadius: 999,
            fontSize: 18,
          }}
        >
          Manufacturer-first data
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 980 }}>
        <div style={{ width: 120, height: 8, background: '#e1b63f', borderRadius: 999, marginBottom: 28 }} />
        <div style={{ display: 'flex', fontSize: 68, lineHeight: 1.04, fontWeight: 800, letterSpacing: -2.5 }}>
          Farm equipment specs, parts and fitment data.
        </div>
        <div style={{ display: 'flex', marginTop: 24, color: '#c9d4cc', fontSize: 27, lineHeight: 1.35 }}>
          Source-backed tractor and agricultural equipment reference for the United States.
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 21 }}>
        <div style={{ display: 'flex', color: '#e1b63f', fontWeight: 700 }}>
          Specs · Parts · Fitment · Comparisons
        </div>
        <div style={{ display: 'flex', color: '#c9d4cc' }}>farmmachinespecs.com</div>
      </div>
    </div>
  );
}
