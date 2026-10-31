"""Run: python -B scripts/tests/test_facecam_styles.py (existing NumPy/OpenCV only)."""
import importlib.util
from pathlib import Path
import unittest
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
SCRIPTS = ROOT / 'src-tauri' / 'assets' / 'segmentation'
import sys
sys.path.insert(0,str(SCRIPTS))
import facecam_style as effects

class FacecamFrames(unittest.TestCase):
    def setUp(self):
        self.rgb = np.full((320,180,3),140,np.uint8)
        self.mask = np.zeros((320,180),np.float32)
        self.mask[90:280,65:115] = 1
        self.plate = np.full((20,60,4),255,np.uint8)
        self.settings = dict(style='lean-in',strength=.8,zoom=1.25,x=.5,y=.2,accent='#E5733A',textColor='#FFFFFF',background='#14141C',parallax=False,fromValue=0,toValue=100,graph=True)
    def test_all_styles_return_rgb_frames_at_boundaries_and_midpoint(self):
        for style in effects.STYLES:
            for t in (0,.5,1):
                with self.subTest(style=style,t=t):
                    frame=effects.render_frame(self.rgb,self.mask,dict(self.settings,style=style),[self.plate],t,1)
                    self.assertEqual(frame.shape,self.rgb.shape)
                    self.assertEqual(frame.dtype,np.uint8)
    def test_behind_text_never_covers_the_person(self):
        frame=effects.render_frame(self.rgb,self.mask,dict(self.settings,style='text-behind',y=.4),[self.plate],.5,1)
        np.testing.assert_array_equal(frame[self.mask==1],self.rgb[self.mask==1])
        self.assertTrue(np.any(frame[self.mask==0]!=self.rgb[self.mask==0]))
    def test_camera_and_card_exit_cleanly_and_counter_can_count_down(self):
        for style in ('lean-in','name-tag','glass-card'):
            for t in (0,1):
                frame=effects.render_frame(self.rgb,self.mask,dict(self.settings,style=style,fromValue=100,toValue=-20),[self.plate],t,1)
                np.testing.assert_array_equal(frame,self.rgb)
    def test_backdrop_spaces_and_parallax_are_supported(self):
        for style in ('backdrop-word','slow-push'):
            frame=effects.render_frame(self.rgb,self.mask,dict(self.settings,style=style,parallax=True),[self.plate,None,self.plate],.5,1)
            self.assertEqual(frame.shape,self.rgb.shape)
    def test_silhouette_reveals_original_and_fade_only_darkens_bottom(self):
        frame=effects.render_frame(self.rgb,self.mask,dict(self.settings,style='silhouette-intro'),[],1,1)
        np.testing.assert_array_equal(frame,self.rgb)
        frame=effects.render_frame(self.rgb,None,dict(self.settings,style='bottom-fade'),[],.5,1)
        np.testing.assert_array_equal(frame[:100],self.rgb[:100])
        self.assertLess(float(frame[-1].mean()),float(self.rgb[-1].mean()))

if __name__=='__main__': unittest.main()
